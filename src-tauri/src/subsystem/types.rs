use std::str::FromStr;
use serde::{Deserialize, Serialize};
/// Which chat subsystem a message belongs to.
#[derive(Default, Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SubSystemEnum {
    /// Default variant, used when a record does not carry a subsystem.
    #[default]
    General,
    Finance,
    Map,
    CodeEditor,
    Video,
    SandBox3D,
    BlockChain,
    ImageEditor,
    PixelEditor,
    DataBaseClient,
    DockerClient,
    ApiClient,
}
impl SubSystemEnum {
    /// Enum -> canonical lowercase string.
    pub fn as_str(&self) -> &'static str {
        match self {
            SubSystemEnum::General => "general",
            SubSystemEnum::Finance => "finance",
            SubSystemEnum::Map => "map",
            SubSystemEnum::CodeEditor => "code_editor",
            SubSystemEnum::Video => "video",
            SubSystemEnum::SandBox3D => "sandbox3d",
            SubSystemEnum::BlockChain => "block_chain",
            SubSystemEnum::ImageEditor => "image_editor",
            SubSystemEnum::PixelEditor => "pixel_editor",
            SubSystemEnum::DataBaseClient => "database_client",
            SubSystemEnum::DockerClient => "docker_client",
            SubSystemEnum::ApiClient => "api_client",
        }
    }
    /// String -> enum. Case-insensitive; unknown values return an error.
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "general" => Ok(SubSystemEnum::General),
            "finance" => Ok(SubSystemEnum::Finance),
            "map" => Ok(SubSystemEnum::Map),
            "code_editor" => Ok(SubSystemEnum::CodeEditor),
            "video" => Ok(SubSystemEnum::Video),
            "sandbox3d" => Ok(SubSystemEnum::SandBox3D),
            "block_chain" => Ok(SubSystemEnum::BlockChain),
            "image_editor" => Ok(SubSystemEnum::ImageEditor),
            "pixel_editor" => Ok(SubSystemEnum::PixelEditor),
            "database_client" => Ok(SubSystemEnum::DataBaseClient),
            "docker_client" => Ok(SubSystemEnum::DockerClient),
            "api_client" => Ok(SubSystemEnum::ApiClient),
            other => Err(format!("Unknown subsystem: {}", other)),
        }
    }
}
impl std::fmt::Display for SubSystemEnum {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}
impl FromStr for SubSystemEnum {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        SubSystemEnum::from_str(s)
    }
}
