use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{mpsc, Mutex},
    thread,
    time::Duration,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
pub struct LocalApi {
    pending: Mutex<HashMap<String, mpsc::Sender<ApiReply>>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApiRequest {
    id: String,
    method: String,
    path: String,
    body: Value,
    idempotency_key: Option<String>,
}

#[derive(Deserialize)]
pub struct ApiReply {
    status: u16,
    body: Value,
}

#[tauri::command]
pub fn reply_local_api(api: State<LocalApi>, id: String, reply: ApiReply) -> Result<(), String> {
    if let Some(sender) = api.pending.lock().map_err(|e| e.to_string())?.remove(&id) {
        let _ = sender.send(reply);
    }
    Ok(())
}

pub fn start_api(app: &AppHandle) -> Result<(), String> {
    let server = tiny_http::Server::http("127.0.0.1:0").map_err(|e| e.to_string())?;
    let address = server
        .server_addr()
        .to_ip()
        .ok_or("Missing loopback address")?;
    let token = format!("{}{}", uuid::Uuid::new_v4(), uuid::Uuid::new_v4());
    let descriptor = directory(app)?.join("local-api.json");
    atomic_write(
        &descriptor,
        serde_json::to_vec(&json!({
            "schemaVersion": 1,
            "apiUrl": format!("http://{address}"),
            "token": token,
            "pid": std::process::id()
        }))
        .map_err(|e| e.to_string())?
        .as_slice(),
    )?;
    let app = app.clone();
    thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let header = |name: &str| {
                request
                    .headers()
                    .iter()
                    .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case(name))
                    .map(|h| h.value.as_str().to_owned())
            };
            // Reject browser-origin traffic and DNS rebinding before reading bodies.
            let authorized = header("Authorization").as_deref() == Some(&format!("Bearer {token}"))
                && header("Host").as_deref() == Some(&address.to_string())
                && header("Origin").is_none();
            let reply = if !authorized {
                ApiReply {
                    status: 403,
                    body: json!({"error": "Local desktop authorization required."}),
                }
            } else if request.body_length().unwrap_or(0) > 16 * 1024 * 1024 {
                ApiReply {
                    status: 413,
                    body: json!({"error": "Request too large."}),
                }
            } else {
                let idempotency_key = header("Idempotency-Key");
                let method = request.method().as_str().to_owned();
                let path = request.url().to_owned();
                let mut bytes = Vec::new();
                use std::io::Read;
                let read = request
                    .as_reader()
                    .take(16 * 1024 * 1024 + 1)
                    .read_to_end(&mut bytes);
                let body = if bytes.is_empty() {
                    Ok(json!({}))
                } else {
                    serde_json::from_slice(&bytes)
                };
                if read.is_err() || bytes.len() > 16 * 1024 * 1024 || body.is_err() {
                    ApiReply {
                        status: 400,
                        body: json!({"error": "Invalid JSON request."}),
                    }
                } else {
                    let id = uuid::Uuid::new_v4().to_string();
                    let (sender, receiver) = mpsc::channel();
                    let api = app.state::<LocalApi>();
                    api.pending.lock().unwrap().insert(id.clone(), sender);
                    let _ = app.emit_to(
                        "main",
                        "lightflux://local-api",
                        ApiRequest {
                            id: id.clone(),
                            method,
                            path,
                            body: body.unwrap(),
                            idempotency_key,
                        },
                    );
                    let reply = receiver.recv_timeout(Duration::from_secs(15)).unwrap_or(ApiReply {
                        status: 503, body: json!({"error": "Desktop is not ready. Open LightFlux and retry."}),
                    });
                    api.pending.lock().unwrap().remove(&id);
                    reply
                }
            };
            let response = tiny_http::Response::from_string(reply.body.to_string())
                .with_status_code(reply.status)
                .with_header(
                    tiny_http::Header::from_bytes("Content-Type", "application/json").unwrap(),
                )
                .with_header(tiny_http::Header::from_bytes("Cache-Control", "no-store").unwrap());
            let _ = request.respond(response);
        }
    });
    Ok(())
}

pub struct LocalStorage(pub Mutex<()>);

pub(crate) fn directory(app: &AppHandle) -> Result<PathBuf, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o700)).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

fn validate(content: &str) -> Result<Value, String> {
    let value: Value = serde_json::from_str(content).map_err(|e| e.to_string())?;
    if value["schemaVersion"] != 12 || !value["todos"].is_array() || !value["projects"].is_array() {
        return Err("Unrecognized local state; existing data has been preserved.".into());
    }
    Ok(value)
}

pub(crate) fn atomic_write(path: &Path, content: &[u8]) -> Result<(), String> {
    let temporary = path.with_extension("pending");
    let mut options = OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(&temporary).map_err(|e| e.to_string())?;
    file.write_all(content).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(&temporary, path).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    fs::File::open(path.parent().ok_or("Missing directory")?)
        .and_then(|dir| dir.sync_all())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_local_app_state(
    app: AppHandle,
    storage: State<LocalStorage>,
) -> Result<Option<String>, String> {
    let _guard = storage.0.lock().map_err(|e| e.to_string())?;
    let path = directory(&app)?.join("local-state-v12.json");
    match fs::read_to_string(path) {
        Ok(content) => {
            validate(&content)?;
            Ok(Some(content))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn save_local_app_state(
    app: AppHandle,
    storage: State<LocalStorage>,
    content: String,
    restore: Option<bool>,
) -> Result<(), String> {
    let _guard = storage.0.lock().map_err(|e| e.to_string())?;
    let directory = directory(&app)?;
    save_state(&directory, &content, restore == Some(true))
}

fn save_state(directory: &Path, content: &str, restore: bool) -> Result<(), String> {
    let value = validate(content)?;
    let path = directory.join("local-state-v12.json");
    match fs::read_to_string(&path) {
        Ok(previous) => {
            let previous_valid = validate(&previous);
            if previous_valid.is_err() && restore {
                let timestamp = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map_err(|e| e.to_string())?
                    .as_nanos();
                atomic_write(
                    &directory.join(format!("recovery-original-{timestamp}.json")),
                    previous.as_bytes(),
                )?;
                return atomic_write(&path, content.as_bytes());
            }
            let mut previous_value = previous_valid?;
            let mut next_value = value;
            previous_value.as_object_mut().unwrap().remove("updatedAt");
            next_value.as_object_mut().unwrap().remove("updatedAt");
            if previous_value == next_value {
                return Ok(());
            }
            let backups = directory.join("backups");
            fs::create_dir_all(&backups).map_err(|e| e.to_string())?;
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos();
            // Backup must succeed before replacing the only current state.
            atomic_write(
                &backups.join(format!("lightflux-auto-{timestamp}.json")),
                serde_json::to_vec(&json!({
                    "format": "lightflux-app-state",
                    "version": 1,
                    "createdAt": (timestamp / 1_000_000) as u64,
                    "state": serde_json::from_str::<Value>(&previous).map_err(|e| e.to_string())?
                }))
                .map_err(|e| e.to_string())?
                .as_slice(),
            )?;
            let mut files: Vec<_> = fs::read_dir(&backups)
                .map_err(|e| e.to_string())?
                .filter_map(Result::ok)
                .filter(|entry| {
                    entry
                        .file_name()
                        .to_string_lossy()
                        .starts_with("lightflux-auto-")
                })
                .collect();
            files.sort_by_key(|entry| entry.file_name());
            let expired = files.len().saturating_sub(30);
            for entry in files.into_iter().take(expired) {
                fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(e.to_string()),
    }
    atomic_write(&path, content.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unrecognized_state() {
        assert!(validate(r#"{"schemaVersion":11,"todos":[],"projects":[]}"#).is_err());
        assert!(validate(r#"{"schemaVersion":12,"todos":[],"projects":[]}"#).is_ok());
        assert!(validate("broken").is_err());
    }

    #[test]
    fn atomically_replaces_and_keeps_importable_backup() {
        let path = std::env::temp_dir().join(format!("lightflux-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&path).unwrap();
        let first = r#"{"schemaVersion":12,"todos":[],"projects":[],"updatedAt":1}"#;
        save_state(&path, first, false).unwrap();
        save_state(&path, first, false).unwrap();
        assert!(!path.join("backups").exists());
        let next = r#"{"schemaVersion":12,"todos":[{"id":"a"}],"projects":[],"updatedAt":2}"#;
        save_state(&path, next, false).unwrap();
        assert_eq!(
            fs::read_to_string(path.join("local-state-v12.json")).unwrap(),
            next
        );
        let backup = fs::read_dir(path.join("backups"))
            .unwrap()
            .next()
            .unwrap()
            .unwrap();
        let value: Value =
            serde_json::from_str(&fs::read_to_string(backup.path()).unwrap()).unwrap();
        assert_eq!(value["format"], "lightflux-app-state");
        assert_eq!(
            value["state"],
            serde_json::from_str::<Value>(first).unwrap()
        );
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn corrupt_state_requires_explicit_restore_and_is_preserved() {
        let path = std::env::temp_dir().join(format!("lightflux-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&path).unwrap();
        fs::write(path.join("local-state-v12.json"), "corrupt original").unwrap();
        let valid = r#"{"schemaVersion":12,"todos":[],"projects":[]}"#;
        assert!(save_state(&path, valid, false).is_err());
        save_state(&path, valid, true).unwrap();
        let original = fs::read_dir(&path)
            .unwrap()
            .filter_map(Result::ok)
            .find(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("recovery-original-")
            })
            .unwrap();
        assert_eq!(
            fs::read_to_string(original.path()).unwrap(),
            "corrupt original"
        );
        fs::remove_dir_all(path).unwrap();
    }
}
