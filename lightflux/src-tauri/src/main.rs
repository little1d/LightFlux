#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod chat;
mod desktop;
mod local;

fn main() {
    let builder = tauri::Builder::default()
        .manage(local::LocalStorage(std::sync::Mutex::new(())))
        .manage(local::LocalApi::default())
        .manage(chat::ChatRequests::default())
        .manage(chat::ChatCredentials::default())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            desktop::setup(app)?;
            local::start_api(app.handle()).map_err(std::io::Error::other)?;
            Ok(())
        })
        .on_window_event(desktop::handle_window_event)
        .invoke_handler(tauri::generate_handler![
            local::load_local_app_state,
            local::save_local_app_state,
            local::reply_local_api,
            chat::load_chat_state,
            chat::save_chat_state,
            chat::has_chat_key,
            chat::store_chat_key,
            chat::remove_chat_key,
            chat::stream_chat,
            chat::cancel_chat_request,
            desktop::apply_desktop_preferences,
            desktop::desktop_environment,
            desktop::export_app_state_backup,
            desktop::load_desktop_auth_token,
            desktop::quit_desktop,
            desktop::store_desktop_auth_token,
            desktop::update_desktop_status,
        ]);

    let updater_public_key = option_env!("LIGHTFLUX_UPDATER_PUBLIC_KEY")
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let builder = if let Some(public_key) = updater_public_key {
        builder.plugin(
            tauri_plugin_updater::Builder::new()
                .pubkey(public_key)
                .build(),
        )
    } else {
        builder
    };

    builder
        .run(tauri::generate_context!())
        .expect("error while running LightFlux");
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    #[test]
    fn release_versions_stay_synchronized() {
        let package: Value = serde_json::from_str(include_str!("../../package.json")).unwrap();
        let app: Value = serde_json::from_str(include_str!("../../app.json")).unwrap();
        let tauri: Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let version = env!("CARGO_PKG_VERSION");

        assert_eq!(package["version"], version);
        assert_eq!(app["expo"]["version"], version);
        assert_eq!(tauri["version"], version);
    }
}
