#![allow(warnings)]
#![windows_subsystem = "windows"] 
fn main() {
    #[cfg(debug_assertions)]
    {
        simple_logger::SimpleLogger::new().with_level(log::LevelFilter::Debug).init().unwrap();
    }
    app_lib::run();
}
