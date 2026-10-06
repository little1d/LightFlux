use futures_util::StreamExt;
use serde_json::Value;
use std::{
    collections::{HashMap, HashSet, VecDeque},
    fs,
    path::Path,
    sync::Mutex,
    time::Duration,
};
use tauri::{ipc::Channel, AppHandle, State};
use tokio::sync::oneshot;

use crate::local::{atomic_write, directory, LocalStorage};

#[derive(Default)]
pub struct ChatRequests(Mutex<RequestRegistry>);

#[derive(Default)]
pub struct ChatCredentials(Mutex<HashMap<String, Option<String>>>);

impl ChatCredentials {
    fn get_or_load(
        &self,
        service: &str,
        load: impl FnOnce() -> Result<Option<String>, String>,
    ) -> Result<Option<String>, String> {
        let mut values = self.0.lock().map_err(|_| "key-store-unavailable")?;
        if let Some(value) = values.get(service) {
            return Ok(value.clone());
        }
        let value = load()?;
        values.insert(service.to_owned(), value.clone());
        Ok(value)
    }

    fn remember(&self, service: &str, value: Option<String>) -> Result<(), String> {
        self.0
            .lock()
            .map_err(|_| "key-store-unavailable")?
            .insert(service.to_owned(), value);
        Ok(())
    }
}

#[derive(Default)]
struct RequestRegistry {
    active: HashMap<String, oneshot::Sender<()>>,
    early_cancellations: VecDeque<String>,
}

impl RequestRegistry {
    fn begin(&mut self, id: &str) -> Result<oneshot::Receiver<()>, String> {
        // A synchronous cancel command can arrive before the async stream
        // command is polled. Remember that cancellation across IPC scheduling.
        if let Some(index) = self.early_cancellations.iter().position(|item| item == id) {
            self.early_cancellations.remove(index);
            return Err("cancelled".into());
        }
        if self.active.contains_key(id) || self.active.len() >= 4 {
            return Err("busy".into());
        }
        let (sender, receiver) = oneshot::channel();
        self.active.insert(id.to_owned(), sender);
        Ok(receiver)
    }

    fn cancel(&mut self, id: String) {
        if let Some(sender) = self.active.remove(&id) {
            let _ = sender.send(());
        } else {
            if self.early_cancellations.len() >= 32 {
                self.early_cancellations.pop_front();
            }
            self.early_cancellations.push_back(id);
        }
    }
}

fn endpoint(base_url: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(base_url).map_err(|_| "invalid-url")?;
    let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
    if (url.scheme() != "https" && !(url.scheme() == "http" && local))
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("invalid-url".into());
    }
    Ok(url)
}

fn completion_endpoint(base_url: &str, url_mode: Option<&str>) -> Result<reqwest::Url, String> {
    let url = endpoint(base_url)?;
    match url_mode {
        None | Some("base") => endpoint(&format!(
            "{}/chat/completions",
            base_url.trim_end_matches('/')
        )),
        Some("endpoint") => Ok(url),
        _ => Err("invalid-url".into()),
    }
}

fn credential(identifier: &str, base_url: &str) -> Result<keyring::Entry, String> {
    endpoint(base_url)?;
    keyring::Entry::new(&format!("{identifier}.ai"), base_url)
        .map_err(|_| "key-store-unavailable".into())
}

fn cached_credential(
    identifier: &str,
    base_url: &str,
    credentials: &ChatCredentials,
) -> Result<Option<String>, String> {
    endpoint(base_url)?;
    credentials.get_or_load(base_url, || {
        match credential(identifier, base_url)?.get_password() {
            Ok(key) if !key.is_empty() => Ok(Some(key)),
            Ok(_) | Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err("key-store-unavailable".into()),
        }
    })
}

fn allowed_keys(value: &Value, allowed: &[&str]) -> bool {
    value
        .as_object()
        .is_some_and(|object| object.keys().all(|key| allowed.contains(&key.as_str())))
}

fn valid_id(value: &Value) -> bool {
    value.as_str().is_some_and(|id| {
        !id.is_empty()
            && id.len() <= 200
            && id
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
    })
}

fn valid_date(value: &Value) -> bool {
    value.as_str().is_some_and(|date| {
        let bytes = date.as_bytes();
        bytes.len() == 10
            && bytes[4] == b'-'
            && bytes[7] == b'-'
            && bytes
                .iter()
                .enumerate()
                .all(|(index, byte)| matches!(index, 4 | 7) || byte.is_ascii_digit())
            && date[5..7]
                .parse::<u8>()
                .is_ok_and(|month| (1..=12).contains(&month))
            && date[8..10]
                .parse::<u8>()
                .is_ok_and(|day| (1..=31).contains(&day))
    })
}

fn valid_priority(value: &Value) -> bool {
    matches!(value.as_str(), Some("none" | "low" | "medium" | "high"))
}

fn valid_tool_name(value: &Value) -> bool {
    matches!(
        value.as_str(),
        Some("search_tasks" | "list_projects" | "create_task" | "change_task")
    )
}

fn valid_tool_arguments(name: &str, arguments: &str) -> bool {
    if arguments.len() > 16_000 {
        return false;
    }
    let Ok(value) = serde_json::from_str::<Value>(arguments) else {
        return false;
    };
    let Some(args) = value.as_object() else {
        return false;
    };
    let allowed: &[&str] = match name {
        "search_tasks" => &["query", "project", "scheduledDate", "status"],
        "list_projects" => &["query"],
        "create_task" => &["title", "scheduledDate", "priority", "project"],
        "change_task" => &[
            "task",
            "action",
            "title",
            "scheduledDate",
            "priority",
            "project",
        ],
        _ => return false,
    };
    if args.keys().any(|key| !allowed.contains(&key.as_str()))
        || args.iter().any(|(key, value)| match key.as_str() {
            "scheduledDate" => !valid_date(value),
            "priority" => !valid_priority(value),
            "status" => !matches!(
                value.as_str(),
                Some("active" | "completed" | "trash" | "all")
            ),
            "action" => !matches!(
                value.as_str(),
                Some("update" | "complete" | "reopen" | "trash" | "restore" | "delete")
            ),
            _ => !value
                .as_str()
                .is_some_and(|text| !text.trim().is_empty() && text.len() <= 500),
        })
    {
        return false;
    }
    if name == "create_task" && !args.get("title").is_some_and(|value| value.is_string()) {
        return false;
    }
    if name == "change_task" {
        let Some(action) = args.get("action").and_then(Value::as_str) else {
            return false;
        };
        if !args.get("task").is_some_and(|value| value.is_string()) {
            return false;
        }
        let changes = args
            .keys()
            .filter(|key| !matches!(key.as_str(), "task" | "action"))
            .count();
        if (action == "update") != (changes > 0) {
            return false;
        }
    }
    true
}

fn valid_local_request(value: &Value) -> bool {
    if !allowed_keys(value, &["method", "path", "body", "idempotencyKey"])
        || value["method"] != "POST"
        || !value["idempotencyKey"]
            .as_str()
            .is_some_and(|key| !key.trim().is_empty() && key.len() <= 200)
    {
        return false;
    }
    let Some(path) = value["path"].as_str() else {
        return false;
    };
    let Some(body) = value["body"].as_object() else {
        return false;
    };
    let create = path
        .strip_prefix("/api/v1/projects/")
        .and_then(|rest| rest.strip_suffix("/tasks"))
        .is_some_and(|id| !id.is_empty() && !id.contains('/'));
    let mutation = path
        .strip_prefix("/api/v1/tasks/")
        .and_then(|rest| rest.strip_suffix("/mutations"))
        .is_some_and(|id| !id.is_empty() && !id.contains('/'));
    if create {
        return body
            .keys()
            .all(|key| matches!(key.as_str(), "title" | "scheduledDate" | "priority"))
            && body
                .get("title")
                .and_then(Value::as_str)
                .is_some_and(|title| !title.trim().is_empty() && title.len() <= 500)
            && body.get("scheduledDate").is_some_and(valid_date)
            && body.get("priority").is_some_and(valid_priority);
    }
    if !mutation
        || !body
            .keys()
            .all(|key| matches!(key.as_str(), "action" | "expectedVersion" | "changes"))
        || !body
            .get("expectedVersion")
            .and_then(Value::as_u64)
            .is_some_and(|version| version > 0)
    {
        return false;
    }
    let Some(action) = body.get("action").and_then(Value::as_str) else {
        return false;
    };
    if action != "task.update" {
        return matches!(
            action,
            "task.complete" | "task.reopen" | "task.trash" | "task.restore" | "task.delete"
        ) && !body.contains_key("changes");
    }
    let Some(changes) = body.get("changes").and_then(Value::as_object) else {
        return false;
    };
    !changes.is_empty()
        && changes.iter().all(|(key, value)| match key.as_str() {
            "title" | "projectId" => value
                .as_str()
                .is_some_and(|text| !text.trim().is_empty() && text.len() <= 500),
            "scheduledDate" => valid_date(value),
            "priority" => valid_priority(value),
            _ => false,
        })
}

fn valid_history_tool(value: &Value) -> bool {
    if !allowed_keys(
        value,
        &["call", "status", "request", "output", "mutationId"],
    ) {
        return false;
    }
    let call = &value["call"];
    let Some(name) = call["name"].as_str() else {
        return false;
    };
    if !allowed_keys(call, &["id", "name", "arguments"])
        || !valid_id(&call["id"])
        || !valid_tool_name(&call["name"])
        || !call["arguments"]
            .as_str()
            .is_some_and(|arguments| valid_tool_arguments(name, arguments))
    {
        return false;
    }
    let Some(status) = value["status"].as_str() else {
        return false;
    };
    if !matches!(
        status,
        "pending" | "confirmed" | "done" | "cancelled" | "undone"
    ) || value
        .get("request")
        .is_some_and(|request| !valid_local_request(request))
        || value
            .get("output")
            .is_some_and(|output| !output.as_str().is_some_and(|text| text.len() <= 100_000))
        || value.get("mutationId").is_some_and(|id| !id.is_string())
        || (status == "confirmed" && value.get("request").is_none())
        || (matches!(status, "done" | "cancelled" | "undone")
            && !value.get("output").is_some_and(Value::is_string))
    {
        return false;
    }
    true
}

fn valid_request_body(body: &Value) -> bool {
    let tools = body.get("tools");
    allowed_keys(
        body,
        &[
            "model",
            "messages",
            "stream",
            "tools",
            "parallel_tool_calls",
        ],
    ) && body["model"].is_string()
        && body["messages"].is_array()
        && body["stream"] == true
        && !tools.is_some_and(|tools| {
            !tools.as_array().is_some_and(|items| {
                items.len() == 4
                    && items.iter().all(|tool| {
                        tool["type"] == "function" && valid_tool_name(&tool["function"]["name"])
                    })
            })
        })
        && !(tools.is_some() && body.get("parallel_tool_calls") != Some(&Value::Bool(false)))
        && !(tools.is_none() && body.get("parallel_tool_calls").is_some())
        && body.to_string().len() <= 1_000_000
}

#[tauri::command]
pub fn has_chat_key(
    app: AppHandle,
    credentials: State<ChatCredentials>,
    base_url: String,
) -> Result<bool, String> {
    Ok(cached_credential(&app.config().identifier, &base_url, &credentials)?.is_some())
}

#[tauri::command]
pub fn store_chat_key(
    app: AppHandle,
    credentials: State<ChatCredentials>,
    base_url: String,
    key: String,
) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() || key.len() > 4096 || !key.bytes().all(|b| (0x21..=0x7e).contains(&b)) {
        return Err("invalid-key".into());
    }
    credential(&app.config().identifier, &base_url)?
        .set_password(key)
        .map_err(|_| "key-store-unavailable".to_owned())?;
    credentials.remember(&base_url, Some(key.to_owned()))
}

#[tauri::command]
pub fn remove_chat_key(
    app: AppHandle,
    credentials: State<ChatCredentials>,
    base_url: String,
) -> Result<(), String> {
    match credential(&app.config().identifier, &base_url)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => credentials.remember(&base_url, None),
        Err(_) => Err("key-store-unavailable".into()),
    }
}

fn validate_state(content: &str) -> Result<(), String> {
    let value: Value = serde_json::from_str(content).map_err(|_| "history-invalid")?;
    if value["schemaVersion"] != 1
        || !value["config"]["baseUrl"].is_string()
        || !value["config"]["model"].is_string()
        || value["config"]
            .get("urlMode")
            .is_some_and(|mode| !matches!(mode.as_str(), Some("base" | "endpoint")))
        || value.get("activeId").is_none()
        || !(value["activeId"].is_null() || value["activeId"].is_string())
    {
        return Err("history-invalid".into());
    }
    let conversations = value["conversations"].as_array().ok_or("history-invalid")?;
    let mut ids = HashSet::new();
    let valid_time = |v: &Value| v.as_f64().is_some_and(|n| n.is_finite() && n >= 0.0);
    for conversation in conversations {
        let id = conversation["id"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("history-invalid")?;
        if !ids.insert(id)
            || !conversation["title"].is_string()
            || !valid_time(&conversation["createdAt"])
            || !valid_time(&conversation["updatedAt"])
        {
            return Err("history-invalid".into());
        }
        let messages = conversation["messages"]
            .as_array()
            .ok_or("history-invalid")?;
        let mut message_ids = HashSet::new();
        for message in messages {
            let id = message["id"]
                .as_str()
                .filter(|s| !s.is_empty())
                .ok_or("history-invalid")?;
            if !message_ids.insert(id)
                || !matches!(message["role"].as_str(), Some("user" | "assistant"))
                || !message["content"].is_string()
                || !valid_time(&message["createdAt"])
                || !matches!(
                    message["status"].as_str(),
                    Some("complete" | "streaming" | "stopped" | "error" | "interrupted")
                )
                || message.get("error").is_some_and(|e| !e.is_string())
                || message
                    .get("tool")
                    .is_some_and(|tool| message["role"] != "assistant" || !valid_history_tool(tool))
            {
                return Err("history-invalid".into());
            }
        }
    }
    if value["activeId"]
        .as_str()
        .is_some_and(|id| !ids.contains(id))
    {
        return Err("history-invalid".into());
    }
    Ok(())
}

#[tauri::command]
pub fn load_chat_state(
    app: AppHandle,
    storage: State<LocalStorage>,
) -> Result<Option<String>, String> {
    let _guard = storage.0.lock().map_err(|_| "history-unavailable")?;
    match fs::read_to_string(directory(&app)?.join("chat-v1.json")) {
        Ok(content) => {
            validate_state(&content)?;
            Ok(Some(content))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err("history-unavailable".into()),
    }
}

fn save_state(directory: &Path, content: &str) -> Result<(), String> {
    validate_state(content)?;
    let path = directory.join("chat-v1.json");
    match fs::read_to_string(&path) {
        Ok(previous) => {
            validate_state(&previous)?;
            if previous == content {
                return Ok(());
            }
            atomic_write(&directory.join("chat-v1.backup.json"), previous.as_bytes())?;
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(_) => return Err("save-failed".into()),
    }
    atomic_write(&path, content.as_bytes()).map_err(|_| "save-failed".into())
}

#[tauri::command]
pub fn save_chat_state(
    app: AppHandle,
    storage: State<LocalStorage>,
    content: String,
) -> Result<(), String> {
    let _guard = storage.0.lock().map_err(|_| "save-failed")?;
    save_state(&directory(&app)?, &content)
}

#[tauri::command]
pub fn cancel_chat_request(requests: State<ChatRequests>, id: String) {
    if let Ok(mut requests) = requests.0.lock() {
        requests.cancel(id);
    }
}

async fn request_stream(
    identifier: &str,
    credentials: &ChatCredentials,
    base_url: String,
    url_mode: Option<String>,
    body: Value,
    on_chunk: Channel<Vec<u8>>,
) -> Result<(), String> {
    let url = completion_endpoint(&base_url, url_mode.as_deref())?;
    if !valid_request_body(&body) {
        return Err("invalid-request".into());
    }
    let key = cached_credential(identifier, &base_url, credentials)?
        .ok_or_else(|| "missing-key".to_owned())?;
    forward_stream(url, body, on_chunk, key).await
}

async fn forward_stream(
    url: reqwest::Url,
    body: Value,
    on_chunk: Channel<Vec<u8>>,
    key: String,
) -> Result<(), String> {
    // Chat can be the first HTTP client, before the updater initializes TLS.
    let _ = rustls::crypto::ring::default_provider().install_default();
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|_| "network")?;
    let response = client
        .post(url)
        .bearer_auth(key)
        .json(&body)
        .send()
        .await
        .map_err(network_error)?;
    if !response.status().is_success() {
        // Do not expose provider bodies/URLs that could echo credentials.
        return Err(format!("http-{}", response.status().as_u16()));
    }
    let mut stream = response.bytes_stream();
    let mut total = 0;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(network_error)?;
        total += chunk.len();
        if total > 4_000_000 {
            return Err("response-too-long".into());
        }
        on_chunk.send(chunk.to_vec()).map_err(|_| "interrupted")?;
    }
    Ok(())
}

fn network_error(error: reqwest::Error) -> String {
    if error.is_timeout() {
        "timeout"
    } else {
        "network"
    }
    .into()
}

#[tauri::command]
pub async fn stream_chat(
    app: AppHandle,
    requests: State<'_, ChatRequests>,
    credentials: State<'_, ChatCredentials>,
    id: String,
    base_url: String,
    url_mode: Option<String>,
    body: Value,
    on_chunk: Channel<Vec<u8>>,
) -> Result<(), String> {
    let cancelled = requests.0.lock().map_err(|_| "busy")?.begin(&id)?;
    let result = tokio::select! {
        result = request_stream(&app.config().identifier, &credentials, base_url, url_mode, body, on_chunk) => result,
        _ = cancelled => Err("cancelled".into()),
    };
    if let Ok(mut requests) = requests.0.lock() {
        requests.active.remove(&id);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires a working OS credential vault; uses an isolated temporary credential"]
    fn native_credential_roundtrip() {
        let base_url = format!("http://localhost/test-{}", uuid::Uuid::new_v4());
        struct Cleanup(keyring::Entry);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                let _ = self.0.delete_credential();
            }
        }
        let entry = Cleanup(credential("com.little1d.lightflux.native-test", &base_url).unwrap());
        entry
            .0
            .set_password("lf-synthetic-native-test")
            .expect("native credential vault unavailable");
        assert_eq!(entry.0.get_password().unwrap(), "lf-synthetic-native-test");
        entry.0.delete_credential().unwrap();
        assert!(matches!(
            entry.0.get_password(),
            Err(keyring::Error::NoEntry)
        ));
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn dev_credentials_do_not_replace_existing_stable_credentials() {
        let stable: Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let dev: Value = serde_json::from_str(include_str!("../tauri.dev.conf.json")).unwrap();
        let base_url = "https://api.example.com/v1";
        // Inspect entry metadata without reading or writing the system vault.
        let stable_entry = credential(stable["identifier"].as_str().unwrap(), base_url).unwrap();
        let dev_entry = credential(dev["identifier"].as_str().unwrap(), base_url).unwrap();
        let stable_credential = stable_entry
            .get_credential()
            .downcast_ref::<keyring::macos::MacCredential>()
            .unwrap();
        let dev_credential = dev_entry
            .get_credential()
            .downcast_ref::<keyring::macos::MacCredential>()
            .unwrap();
        assert_eq!(stable_credential.service, "com.little1d.lightflux.ai");
        assert_ne!(dev_credential.service, stable_credential.service);
        assert_eq!(dev_credential.account, stable_credential.account);
    }

    #[tokio::test]
    async fn native_stream_roundtrip() {
        for (path, mode, expected) in [
            ("/v1", None, "/v1/chat/completions"),
            ("/api/crawl", Some("endpoint"), "/api/crawl"),
            ("/api/crawl/", Some("endpoint"), "/api/crawl/"),
        ] {
            assert_native_stream_roundtrip(path, mode, expected).await;
        }
    }

    async fn assert_native_stream_roundtrip(path: &str, mode: Option<&str>, expected: &str) {
        use std::sync::Arc;
        let server = tiny_http::Server::http("127.0.0.1:0").unwrap();
        let base_url = format!("http://{}{path}", server.server_addr());
        let credentials = ChatCredentials::default();
        credentials
            .remember(&base_url, Some("lf-synthetic-native-test".into()))
            .unwrap();
        let reply = "data: {\"choices\":[{\"delta\":{\"content\":\"OK\"},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n";
        let expected = expected.to_owned();
        let server_thread = std::thread::spawn(move || {
            let mut request = server
                .recv_timeout(Duration::from_secs(10))
                .unwrap()
                .unwrap();
            assert_eq!(request.url(), expected);
            assert!(request
                .headers()
                .iter()
                .any(|h| h.field.equiv("Authorization")
                    && h.value.as_str() == "Bearer lf-synthetic-native-test"));
            let mut body = String::new();
            request.as_reader().read_to_string(&mut body).unwrap();
            assert_eq!(
                serde_json::from_str::<Value>(&body).unwrap()["model"],
                "test"
            );
            request
                .respond(tiny_http::Response::from_string(reply).with_header(
                    tiny_http::Header::from_bytes("Content-Type", "text/event-stream").unwrap(),
                ))
                .unwrap();
        });
        let received = Arc::new(Mutex::new(Vec::<u8>::new()));
        let output = received.clone();
        let channel = Channel::new(move |body| {
            output
                .lock()
                .unwrap()
                .extend(body.deserialize::<Vec<u8>>().unwrap());
            Ok(())
        });
        request_stream(
            "com.little1d.lightflux.native-test",
            &credentials,
            base_url,
            mode.map(str::to_owned),
            serde_json::json!({
                "model": "test", "messages": [{"role": "user", "content": "OK"}], "stream": true,
            }),
            channel,
        )
        .await
        .unwrap();
        server_thread.join().unwrap();
        assert_eq!(*received.lock().unwrap(), reply.as_bytes());
    }

    #[test]
    fn cancellation_works_before_and_after_request_registration() {
        let mut registry = RequestRegistry::default();
        registry.cancel("early".into());
        assert!(matches!(registry.begin("early"), Err(error) if error == "cancelled"));
        let mut receiver = registry.begin("active").unwrap();
        registry.cancel("active".into());
        assert!(receiver.try_recv().is_ok());
        assert!(registry.active.is_empty());
    }

    #[test]
    fn credential_cache_loads_each_service_once_and_tracks_changes() {
        let cache = ChatCredentials::default();
        let mut loads = 0;
        let first = cache
            .get_or_load("https://api.example.com/v1", || {
                loads += 1;
                Ok(Some("secret".to_owned()))
            })
            .unwrap();
        let second = cache
            .get_or_load("https://api.example.com/v1", || {
                loads += 1;
                Ok(Some("different".to_owned()))
            })
            .unwrap();
        assert_eq!(loads, 1);
        assert_eq!(first.as_deref(), Some("secret"));
        assert_eq!(second, first);

        cache.remember("https://api.example.com/v1", None).unwrap();
        assert_eq!(
            cache
                .get_or_load("https://api.example.com/v1", || {
                    panic!("cached missing credentials must not access the vault")
                })
                .unwrap(),
            None
        );
        cache
            .remember("https://api.example.com/v1", Some("replacement".to_owned()))
            .unwrap();
        assert_eq!(
            cache
                .get_or_load("https://api.example.com/v1", || {
                    panic!("stored credentials must update the cache")
                })
                .unwrap()
                .as_deref(),
            Some("replacement")
        );
    }

    #[test]
    fn accepts_https_and_loopback_but_rejects_credential_leaks() {
        assert!(endpoint("https://api.example.com/v1").is_ok());
        assert!(endpoint("http://127.0.0.1:8788/v1").is_ok());
        assert!(endpoint("http://[::1]:8788/v1").is_ok());
        assert!(endpoint("http://example.com/v1").is_err());
        assert!(endpoint("https://user:secret@example.com/v1").is_err());
        assert!(endpoint("https://example.com/v1?key=secret").is_err());
        assert!(completion_endpoint("https://example.com/crawl", Some("unknown")).is_err());
        assert!(
            completion_endpoint("https://user:secret@example.com/crawl", Some("endpoint")).is_err()
        );
    }

    #[test]
    fn chat_backup_precedes_replacement_and_corrupt_history_blocks_writes() {
        let directory =
            std::env::temp_dir().join(format!("lightflux-chat-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&directory).unwrap();
        let first = r#"{"schemaVersion":1,"config":{"baseUrl":"https://api.example.com","model":"test"},"activeId":null,"conversations":[]}"#;
        let second = r#"{"schemaVersion":1,"config":{"baseUrl":"https://api.example.com","model":"test"},"activeId":"a","conversations":[{"id":"a","title":"Plan","createdAt":1,"updatedAt":2,"messages":[]}]}"#;
        save_state(&directory, first).unwrap();
        save_state(&directory, second).unwrap();
        assert_eq!(
            fs::read_to_string(directory.join("chat-v1.backup.json")).unwrap(),
            first
        );
        fs::write(directory.join("chat-v1.json"), "corrupt original").unwrap();
        assert!(save_state(&directory, first).is_err());
        assert_eq!(
            fs::read_to_string(directory.join("chat-v1.json")).unwrap(),
            "corrupt original"
        );
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn rejects_partially_corrupt_and_future_history() {
        let state = r#"{"schemaVersion":1,"config":{"baseUrl":"https://api.example.com","model":"test"},"activeId":"a","conversations":[{"id":"a","title":"Plan","createdAt":1,"updatedAt":2,"messages":[{"id":"m","role":"assistant","content":"partial","createdAt":2,"status":"streaming"}]}]}"#;
        assert!(validate_state(state).is_ok());
        assert!(validate_state(&state.replace("\"streaming\"", "\"unknown\"")).is_err());
        assert!(
            validate_state(&state.replace("\"content\":\"partial\"", "\"content\":null")).is_err()
        );
        assert!(
            validate_state(&state.replace("\"schemaVersion\":1", "\"schemaVersion\":2")).is_err()
        );
        assert!(
            validate_state(&state.replace("\"activeId\":\"a\"", "\"activeId\":\"missing\""))
                .is_err()
        );
        assert!(validate_state(&state.replace(
            "\"model\":\"test\"",
            "\"model\":\"test\",\"urlMode\":\"endpoint\""
        ))
        .is_ok());
        assert!(validate_state(&state.replace(
            "\"model\":\"test\"",
            "\"model\":\"test\",\"urlMode\":\"unknown\""
        ))
        .is_err());
    }

    #[test]
    fn validates_tool_history_and_model_request_boundaries() {
        let request = serde_json::json!({
            "method": "POST",
            "path": "/api/v1/projects/inbox/tasks",
            "idempotencyKey": "xiaoguang-fixed",
            "body": { "title": "test", "scheduledDate": "2026-10-06", "priority": "none" }
        });
        let tool = serde_json::json!({
            "call": {
                "id": "call_1",
                "name": "create_task",
                "arguments": "{\"title\":\"test\"}"
            },
            "status": "confirmed",
            "request": request
        });
        let state = serde_json::json!({
            "schemaVersion": 1,
            "config": { "baseUrl": "https://api.example.com", "model": "test" },
            "activeId": "a",
            "conversations": [{
                "id": "a", "title": "Task", "createdAt": 1, "updatedAt": 2,
                "messages": [{
                    "id": "m", "role": "assistant", "content": "", "createdAt": 2,
                    "status": "complete", "tool": tool
                }]
            }]
        });
        assert!(validate_state(&state.to_string()).is_ok());
        let mut forged = state.clone();
        forged["conversations"][0]["messages"][0]["tool"]["request"]["path"] =
            Value::String("/api/v1/workspaces/local/projects".into());
        assert!(validate_state(&forged.to_string()).is_err());

        let tools = [
            "search_tasks",
            "list_projects",
            "create_task",
            "change_task",
        ]
        .map(|name| serde_json::json!({ "type": "function", "function": { "name": name } }));
        let body = serde_json::json!({
            "model": "test",
            "messages": [{ "role": "user", "content": "Create test" }],
            "stream": true,
            "tools": tools,
            "parallel_tool_calls": false
        });
        assert!(valid_request_body(&body));
        let mut invalid = body;
        invalid["tools"][0]["function"]["name"] = Value::String("run_shell".into());
        assert!(!valid_request_body(&invalid));
    }
}
