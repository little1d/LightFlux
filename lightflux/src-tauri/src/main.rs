#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod desktop;

fn main() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .setup(desktop::setup)
        .on_window_event(desktop::handle_window_event)
        .invoke_handler(tauri::generate_handler![
            desktop::apply_desktop_preferences,
            desktop::desktop_environment,
            desktop::quit_desktop,
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
