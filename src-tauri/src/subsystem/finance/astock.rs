use crate::commons::https::HttpClient;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri::command;
/// A-share stock price data structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AStockPrice {
    pub symbol: String,
    pub name: String,
    pub current_price: f64,
    pub change_percent: f64,
    pub change_amount: f64,
    pub volume: u64,
    pub turnover: f64,
    pub high: f64,
    pub low: f64,
    pub open: f64,
    pub prev_close: f64,
    pub exchange: String,
}
/// Response for batch fetch
#[derive(Debug, Serialize, Deserialize)]
pub struct AStockBatchResponse {
    pub success: bool,
    pub message: String,
    pub total: usize,
    pub data: Vec<AStockPrice>,
}
/// OHLCV K-line data structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AStockKLine {
    pub date: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: u64,
    pub amount: f64,
}
/// OHLCV response
#[derive(Debug, Serialize, Deserialize)]
pub struct AStockKLineResponse {
    pub success: bool,
    pub message: String,
    pub symbol: String,
    pub name: String,
    pub total: usize,
    pub data: Vec<AStockKLine>,
}
/// Pre-built list of most traded A-shares
pub const POPULAR_A_STOCKS: &[&str] = &[
    // Financials - Banks
    "sh601398", "sh600036", "sh601288", "sh601939", "sh601988", "sh600016", "sh601328", "sh601166", "sh601169", "sh600000", "sh600015", "sh601818",
    "sh601998", "sh600919", "sh601009", "sh600926", "sh601229", "sh601577", "sh601838", "sh600908", "sz000001", "sz002142", "sz002936", "sz002958",
    // Insurance & Securities
    "sh601318", "sh601628", "sh601601", "sh601336", "sh600030", "sh600837", "sh601688", "sh600999", "sh601211", "sh600958", "sh600109", "sz000776",
    "sz002736", "sz000783", "sz000166", "sz002797", // Consumer - Liquor & Food
    "sh600519", "sz000858", "sh600887", "sh600104", "sh600690", "sh600660", "sh600741", "sh600332", "sz000651", "sz000333", "sz002304", "sz002568",
    "sz002507", "sz002557", // Technology & Electronics
    "sh600276", "sh600585", "sh600900", "sh600028", "sh601857", "sh601668", "sh600050", "sh601390", "sh601186", "sh601800", "sh601088", "sh600018",
    "sz000002", "sz000725", "sz000063", "sz002415", "sz002230", "sz300750", "sz002594", "sz300059", "sz002027", "sz002008", "sz002049", "sz002371",
    "sz002460", "sz002466", "sz300124", "sz300014", "sz300274", "sz300760", "sz300015", "sz300122", "sz300142", "sz300347", "sz300408", "sz300433",
    "sz300498", "sz300601", "sz300628", "sz300661", "sz300676", "sz300782", "sz300896", "sz300999", "sz301236", // More Tech Stocks
    "sh600588", "sh600570", "sh600703", "sh600745", "sh600893", "sh600584", "sh600460", "sh600171", "sh600360", "sh600206", "sz000977", "sz002185",
    "sz002156", "sz002180", "sz002222", "sz002236", "sz002241", "sz002273", // Healthcare
    "sh600196", "sh600521", "sh600867", "sh600998", "sh603259", "sh603368", "sz000538", "sz000623", "sz000963", "sz002001", "sz002007", "sz002038",
    "sz002252", "sz002294", // More diversified
    "sh600309", "sh600438", "sh600809", "sh600872", "sh601012", "sh601100", "sh601225", "sh601633", "sh601689", "sh601888", "sh603501", "sh603986",
    "sz000100", "sz000157", "sz000338", "sz000425", "sz000625", "sz000768", "sz000800", "sz000876", "sz000895", "sz000938", "sz001979", "sz002032",
    "sz002050", "sz002074", "sz002080", "sz002091", "sz002120", "sz002129", "sz002138", "sz002202", "sz002223", "sz002271", "sz002281", "sz002299",
    "sz002311", "sz002340", "sz002352", "sz002384", "sz002385", "sz002405", "sz002410", "sz002422", "sz002430", "sz002444", "sz002459", "sz002463",
    "sz002475", "sz002493", "sz002555", "sz002558", "sz002601", "sz002603", "sz002607", "sz002624", "sz002648", "sz002709", "sz002714", "sz002738",
    "sz002739", "sz002745", "sz002756", "sz002759", "sz002773", "sz002791", "sz002812", "sz002821", "sz002841", "sz002850", "sz002916", "sz002920",
    "sz002938", "sz002939", "sz002945", "sz002960", "sz002985", "sz003022", "sz003035", // Shenzhen A-shares continued
    "sz300001", "sz300003", "sz300012", "sz300026", "sz300033", "sz300037", "sz300039", "sz300054", "sz300058", "sz300068", "sz300070", "sz300073",
    "sz300088", "sz300115", "sz300118", "sz300136", "sz300144", "sz300146", "sz300147", "sz300168", "sz300182", "sz300207", "sz300223", "sz300226",
    "sz300229", "sz300232", "sz300236", "sz300251", "sz300253", "sz300257", "sz300285", "sz300294", "sz300296", "sz300298", "sz300308", "sz300315",
    "sz300316", "sz300339", "sz300357", "sz300363", "sz300373", "sz300377", "sz300383", "sz300390", "sz300394", "sz300395", "sz300396", "sz300398",
    "sz300413", "sz300418", "sz300450", "sz300454", "sz300457", "sz300458", "sz300463", "sz300474", "sz300476", "sz300481", "sz300482", "sz300487",
    "sz300496", "sz300502", "sz300504", "sz300507", "sz300523", "sz300527", "sz300529", "sz300558", "sz300559", "sz300567", "sz300568", "sz300570",
    "sz300572", "sz300573", "sz300595", "sz300596", "sz300604", "sz300613", "sz300618", "sz300623", "sz300630", "sz300633", "sz300638", "sz300639",
    "sz300642", "sz300659", "sz300663", "sz300666", "sz300672", "sz300677", "sz300679", "sz300682", "sz300684", "sz300685", "sz300687", "sz300693",
    "sz300696", "sz300699", "sz300702", "sz300725", "sz300726", "sz300735", "sz300737", "sz300739", "sz300741", "sz300747", "sz300748", "sz300751",
    "sz300752", "sz300755", "sz300756", "sz300757", "sz300759", "sz300761",
];
/// Stock name mapping for fallback
fn get_stock_name(symbol: &str) -> String {
    let map: std::collections::HashMap<&str, &str> = [
        ("sh601398", "工商银行"),
        ("sh600036", "招商银行"),
        ("sh601288", "农业银行"),
        ("sh601939", "建设银行"),
        ("sh601988", "中国银行"),
        ("sh600016", "民生银行"),
        ("sh601328", "交通银行"),
        ("sh601166", "兴业银行"),
        ("sh601169", "北京银行"),
        ("sh600000", "浦发银行"),
        ("sh600015", "华夏银行"),
        ("sh601818", "光大银行"),
        ("sh601998", "中信银行"),
        ("sh600919", "江苏银行"),
        ("sh601009", "南京银行"),
        ("sh600926", "杭州银行"),
        ("sh601229", "上海银行"),
        ("sh601577", "长沙银行"),
        ("sh601838", "成都银行"),
        ("sh600908", "无锡银行"),
        ("sz000001", "平安银行"),
        ("sz002142", "宁波银行"),
        ("sz002936", "郑州银行"),
        ("sz002958", "青农商行"),
        ("sh601318", "中国平安"),
        ("sh601628", "中国人寿"),
        ("sh601601", "中国太保"),
        ("sh601336", "新华保险"),
        ("sh600030", "中信证券"),
        ("sh600837", "海通证券"),
        ("sh601688", "华泰证券"),
        ("sh600999", "招商证券"),
        ("sh601211", "国泰君安"),
        ("sh600958", "东方证券"),
        ("sh600109", "国金证券"),
        ("sz000776", "广发证券"),
        ("sz002736", "国信证券"),
        ("sz000783", "长江证券"),
        ("sz000166", "申万宏源"),
        ("sz002797", "第一创业"),
        ("sh600519", "贵州茅台"),
        ("sz000858", "五粮液"),
        ("sh600887", "伊利股份"),
        ("sh600104", "上汽集团"),
        ("sh600690", "海尔智家"),
        ("sh600660", "福耀玻璃"),
        ("sh600741", "华域汽车"),
        ("sh600332", "白云山"),
        ("sz000651", "格力电器"),
        ("sz000333", "美的集团"),
        ("sz002304", "洋河股份"),
        ("sz002568", "百润股份"),
        ("sz002507", "涪陵榨菜"),
        ("sz002557", "洽洽食品"),
        ("sh600276", "恒瑞医药"),
        ("sh600585", "海螺水泥"),
        ("sh600900", "长江电力"),
        ("sh600028", "中国石化"),
        ("sh601857", "中国石油"),
        ("sh601668", "中国建筑"),
        ("sh600050", "中国联通"),
        ("sh601390", "中国中铁"),
        ("sh601186", "中国铁建"),
        ("sh601800", "中国交建"),
        ("sh601088", "中国神华"),
        ("sh600018", "上港集团"),
        ("sz000002", "万科A"),
        ("sz000725", "京东方A"),
        ("sz000063", "中兴通讯"),
        ("sz002415", "海康威视"),
        ("sz002230", "科大讯飞"),
        ("sz300750", "宁德时代"),
        ("sz002594", "比亚迪"),
        ("sz300059", "东方财富"),
        ("sz002027", "分众传媒"),
        ("sz002008", "大族激光"),
        ("sz002049", "紫光国微"),
        ("sz002371", "北方华创"),
        ("sz002460", "赣锋锂业"),
        ("sz002466", "天齐锂业"),
        ("sz300124", "汇川技术"),
        ("sz300014", "亿纬锂能"),
        ("sz300274", "阳光电源"),
        ("sz300760", "迈瑞医疗"),
        ("sz300015", "爱尔眼科"),
        ("sz300122", "智飞生物"),
        ("sz300142", "沃森生物"),
        ("sz300347", "泰格医药"),
        ("sz300408", "三环集团"),
        ("sz300433", "蓝思科技"),
        ("sz300498", "温氏股份"),
        ("sz300601", "康泰生物"),
        ("sz300628", "亿联网络"),
        ("sz300661", "圣邦股份"),
        ("sz300676", "华大基因"),
        ("sz300782", "卓胜微"),
        ("sz300896", "爱美客"),
        ("sz300999", "金龙鱼"),
        ("sz301236", "软通动力"),
        ("sh600588", "用友网络"),
        ("sh600570", "恒生电子"),
        ("sh600703", "三安光电"),
        ("sh600745", "闻泰科技"),
        ("sh600893", "航发动力"),
        ("sh600584", "长电科技"),
        ("sh600460", "士兰微"),
        ("sh600171", "上海贝岭"),
        ("sh600360", "华微电子"),
        ("sh600206", "有研新材"),
        ("sz000977", "浪潮信息"),
        ("sz002185", "华天科技"),
        ("sz002156", "通富微电"),
        ("sz002180", "纳思达"),
        ("sz002222", "福晶科技"),
        ("sz002236", "大华股份"),
        ("sz002241", "歌尔股份"),
        ("sz002273", "水晶光电"),
        ("sh600196", "复星医药"),
        ("sh600521", "华海药业"),
        ("sh600867", "通化东宝"),
        ("sh600998", "九州通"),
        ("sh603259", "药明康德"),
        ("sh603368", "柳药股份"),
        ("sz000538", "云南白药"),
        ("sz000623", "吉林敖东"),
        ("sz000963", "华东医药"),
        ("sz002001", "新和成"),
        ("sz002007", "华兰生物"),
        ("sz002038", "双鹭药业"),
        ("sz002252", "上海莱士"),
        ("sz002294", "信立泰"),
        ("sh600309", "万华化学"),
        ("sh600438", "通威股份"),
        ("sh600809", "山西汾酒"),
        ("sh600872", "中炬高新"),
        ("sh601012", "隆基绿能"),
        ("sh601100", "恒立液压"),
        ("sh601225", "陕西煤业"),
        ("sh601633", "长城汽车"),
        ("sh601689", "拓普集团"),
        ("sh601888", "中国中免"),
        ("sh603501", "韦尔股份"),
        ("sh603986", "兆易创新"),
        ("sz000100", "TCL科技"),
        ("sz000157", "中联重科"),
        ("sz000338", "潍柴动力"),
        ("sz000425", "徐工机械"),
        ("sz000625", "长安汽车"),
        ("sz000768", "中航西飞"),
        ("sz000800", "一汽解放"),
        ("sz000876", "新希望"),
        ("sz000895", "双汇发展"),
        ("sz000938", "紫光股份"),
        ("sz001979", "招商蛇口"),
        ("sz002032", "苏泊尔"),
        ("sz002050", "三花智控"),
        ("sz002074", "国轩高科"),
        ("sz002080", "中材科技"),
        ("sz002091", "江苏国泰"),
        ("sz002120", "韵达股份"),
        ("sz002129", "TCL中环"),
        ("sz002138", "顺络电子"),
        ("sz002202", "金风科技"),
        ("sz002223", "鱼跃医疗"),
        ("sz002271", "东方雨虹"),
        ("sz002281", "光迅科技"),
        ("sz002299", "圣农发展"),
        ("sz002311", "海大集团"),
        ("sz002340", "格林美"),
        ("sz002352", "顺丰控股"),
        ("sz002384", "东山精密"),
        ("sz002385", "大北农"),
        ("sz002405", "四维图新"),
        ("sz002410", "广联达"),
        ("sz002422", "科伦药业"),
        ("sz002430", "杭氧股份"),
        ("sz002444", "巨星科技"),
        ("sz002459", "晶澳科技"),
        ("sz002463", "沪电股份"),
        ("sz002475", "立讯精密"),
        ("sz002493", "荣盛石化"),
        ("sz002555", "三七互娱"),
        ("sz002558", "巨人网络"),
        ("sz002601", "龙佰集团"),
        ("sz002603", "以岭药业"),
        ("sz002607", "中公教育"),
        ("sz002624", "完美世界"),
        ("sz002648", "卫星化学"),
        ("sz002709", "天赐材料"),
        ("sz002714", "牧原股份"),
        ("sz002738", "中矿资源"),
        ("sz002739", "万达电影"),
        ("sz002745", "木林森"),
        ("sz002756", "永兴材料"),
        ("sz002759", "天际股份"),
        ("sz002773", "康弘药业"),
        ("sz002791", "坚朗五金"),
        ("sz002812", "恩捷股份"),
        ("sz002821", "凯莱英"),
        ("sz002841", "视源股份"),
        ("sz002850", "科达利"),
        ("sz002916", "深南电路"),
        ("sz002920", "德赛西威"),
        ("sz002938", "鹏鼎控股"),
        ("sz002939", "长城证券"),
        ("sz002945", "华林证券"),
        ("sz002960", "青鸟消防"),
        ("sz002985", "北摩高科"),
        ("sz003022", "联泓新科"),
        ("sz003035", "南网能源"),
    ]
    .iter()
    .copied()
    .collect();
    map.get(symbol).unwrap_or(&symbol).to_string()
}
/// Convert standard symbol to Eastmoney secid format
fn to_eastmoney_symbol(symbol: &str) -> String {
    let symbol_lower = symbol.to_lowercase();
    let code = if symbol_lower.starts_with("sh") {
        &symbol_lower[2..]
    } else if symbol_lower.starts_with("sz") {
        &symbol_lower[2..]
    } else {
        &symbol_lower
    };
    if symbol_lower.starts_with("sh") {
        format!("1.{}", code)
    } else if symbol_lower.starts_with("sz") {
        format!("0.{}", code)
    } else {
        if code.starts_with("6") || code.starts_with("5") {
            format!("1.{}", code)
        } else if code.starts_with("0") || code.starts_with("2") || code.starts_with("3") {
            format!("0.{}", code)
        } else {
            format!("1.{}", code)
        }
    }
}
/// A-Share data fetcher with dual-source (Sina + Tencent) + Eastmoney K-line
pub struct AStockFetcher {
    http: HttpClient,
}
impl AStockFetcher {
    pub fn new() -> Self {
        Self { http: HttpClient::new() }
    }
    /// Fetch A-share prices with dual-source fallback
    pub async fn fetch_prices(&self, symbols: &[&str]) -> Vec<AStockPrice> {
        let mut results = Vec::new();
        let mut all_fetched = HashSet::new();
        let tencent_results = self.fetch_from_tencent(symbols).await;
        for result in &tencent_results {
            if result.current_price > 0.0 {
                all_fetched.insert(result.symbol.clone());
                results.push(result.clone());
            }
        }
        let mut failed_symbols = Vec::new();
        for &symbol in symbols {
            if !all_fetched.contains(symbol) {
                failed_symbols.push(symbol);
            }
        }
        if !failed_symbols.is_empty() {
            let sina_results = self.fetch_from_sina(&failed_symbols).await;
            for result in sina_results {
                if result.current_price > 0.0 && !all_fetched.contains(&result.symbol) {
                    all_fetched.insert(result.symbol.clone());
                    results.push(result);
                }
            }
        }
        results
    }
    /// Fetch from Tencent Finance API
    async fn fetch_from_tencent(&self, symbols: &[&str]) -> Vec<AStockPrice> {
        let mut results = Vec::new();
        for chunk in symbols.chunks(10) {
            let symbols_str = chunk.join(",");
            let url = format!("https://qt.gtimg.cn/q={}", symbols_str);
            match self.http.fetch_text(&url, Some("https://finance.qq.com/")).await {
                Ok(text) => {
                    for line in text.lines() {
                        if let Some(price) = Self::parse_tencent_line(line) {
                            results.push(price);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[AStock] Tencent fetch failed: {}", e);
                }
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
        results
    }
    /// Fetch from Sina Finance API
    async fn fetch_from_sina(&self, symbols: &[&str]) -> Vec<AStockPrice> {
        let mut results = Vec::new();
        for chunk in symbols.chunks(10) {
            let symbols_str = chunk.join(",");
            let url = format!("https://hq.sinajs.cn/list={}", symbols_str);
            match self.http.fetch_text(&url, Some("https://finance.sina.com.cn/")).await {
                Ok(text) => {
                    for line in text.lines() {
                        if let Some(price) = Self::parse_sina_line(line) {
                            results.push(price);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[AStock] Sina fetch failed: {}", e);
                }
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
        results
    }
    /// Parse Tencent Finance format: v_sh600036="1~招商银行~600036~38.86~39.15~38.80~..."
    fn parse_tencent_line(line: &str) -> Option<AStockPrice> {
        let parts: Vec<&str> = line.split('=').collect();
        if parts.len() != 2 {
            return None;
        }
        let symbol_part = parts[0].trim();
        let symbol = if symbol_part.starts_with("v_") {
            symbol_part[2..].to_string()
        } else {
            return None;
        };
        let data_str = parts[1].trim_matches('"');
        let fields: Vec<&str> = data_str.split('~').collect();
        if fields.len() < 10 {
            return None;
        }
        let name = fields[1].to_string();
        let current_price = fields[3].parse::<f64>().ok()?;
        let prev_close = fields[4].parse::<f64>().ok()?;
        let open = fields[5].parse::<f64>().ok()?;
        let volume = fields[6].parse::<u64>().ok()?;
        let turnover = fields[7].parse::<f64>().unwrap_or(0.0) * 10000.0;
        let high = fields[8].parse::<f64>().unwrap_or(current_price);
        let low = fields[9].parse::<f64>().unwrap_or(current_price);
        let change_amount = current_price - prev_close;
        let change_percent = if prev_close > 0.0 { (change_amount / prev_close) * 100.0 } else { 0.0 };
        let exchange = if symbol.starts_with("sh") { "SH".to_string() } else { "SZ".to_string() };
        Some(AStockPrice {
            symbol: symbol.clone(),
            name: if name.is_empty() { get_stock_name(&symbol) } else { name },
            current_price,
            change_percent,
            change_amount,
            volume,
            turnover,
            high,
            low,
            open,
            prev_close,
            exchange,
        })
    }
    /// Parse Sina Finance format: var hq_str_sh600036="招商银行,34.56,34.80,34.52,..."
    fn parse_sina_line(line: &str) -> Option<AStockPrice> {
        let parts: Vec<&str> = line.split('=').collect();
        if parts.len() != 2 {
            return None;
        }
        let symbol_part = parts[0].trim();
        let symbol = if symbol_part.starts_with("var hq_str_") {
            symbol_part[12..].to_string()
        } else {
            return None;
        };
        let data_str = parts[1].trim_matches('"');
        let fields: Vec<&str> = data_str.split(',').collect();
        if fields.len() < 10 {
            return None;
        }
        let name = fields[0].to_string();
        let open = fields[1].parse::<f64>().ok()?;
        let prev_close = fields[2].parse::<f64>().ok()?;
        let current_price = fields[3].parse::<f64>().ok()?;
        let high = fields[4].parse::<f64>().unwrap_or(current_price);
        let low = fields[5].parse::<f64>().unwrap_or(current_price);
        let volume = fields[8].parse::<u64>().ok()?;
        let turnover = fields[9].parse::<f64>().unwrap_or(0.0);
        let change_amount = current_price - prev_close;
        let change_percent = if prev_close > 0.0 { (change_amount / prev_close) * 100.0 } else { 0.0 };
        let exchange = if symbol.starts_with("sh") { "SH".to_string() } else { "SZ".to_string() };
        Some(AStockPrice {
            symbol: symbol.clone(),
            name: if name.is_empty() { get_stock_name(&symbol) } else { name },
            current_price,
            change_percent,
            change_amount,
            volume,
            turnover,
            high,
            low,
            open,
            prev_close,
            exchange,
        })
    }
}
impl Default for AStockFetcher {
    fn default() -> Self {
        Self::new()
    }
}
/// Fetch A-share stock data from Tencent & Sina (dual-source)
#[command]
pub async fn cmd_fetch_a_stocks(count: Option<usize>) -> Result<AStockBatchResponse, String> {
    let fetcher = AStockFetcher::new();
    let count = count.unwrap_or(300);
    let symbols = &POPULAR_A_STOCKS[0..std::cmp::min(count, POPULAR_A_STOCKS.len())];
    let prices = fetcher.fetch_prices(symbols).await;
    if prices.is_empty() {
        Ok(AStockBatchResponse { success: false, message: "Failed to fetch any stock data".to_string(), total: 0, data: Vec::new() })
    } else {
        Ok(AStockBatchResponse { success: true, message: format!("Fetched {} stocks", prices.len()), total: prices.len(), data: prices })
    }
}
/// Get popular A-share symbols list
#[command]
pub fn cmd_get_popular_a_stocks(count: Option<usize>) -> Result<Vec<String>, String> {
    let count = count.unwrap_or(300);
    Ok(POPULAR_A_STOCKS[0..std::cmp::min(count, POPULAR_A_STOCKS.len())].iter().map(|s| s.to_string()).collect())
}
/// Fetch OHLCV K-line data for a single stock
/// Supports multiple timeframes via Tencent Finance API
#[command]
pub async fn cmd_fetch_a_stock_ohlcv(
    symbol: String,
    period: Option<String>,
    count: Option<usize>,
    adjust: Option<bool>,
) -> Result<AStockKLineResponse, String> {
    let fetcher = AStockFetcher::new();
    let count = count.unwrap_or(300);
    let count = if count > 1000 { 1000 } else { count };
    let count = if count < 1 { 1 } else { count };
    // Default to daily if not specified
    let period = period.unwrap_or_else(|| "101".to_string());
    let name = get_stock_name(&symbol);
    // Map period to Tencent timeframe
    // Tencent API: day, week, month, 1min, 5min, 15min, 30min, 60min
    let tf = match period.as_str() {
        "1" => "1min",
        "5" => "5min",
        "15" => "15min",
        "30" => "30min",
        "60" => "60min",
        "101" => "day",
        "102" => "week",
        "103" => "month",
        _ => "day",
    };
    // Tencent K-line API with dynamic timeframe
    let url = format!("https://web.ifzq.gtimg.cn/appstock/app/kline/kline?param={},{},,,{}", symbol, tf, count);
    eprintln!("[AStock] Tencent K-line URL: {}", url);
    match fetcher.http.fetch_json(&url, Some("https://finance.qq.com/")).await {
        Ok(json) => {
            eprintln!("[AStock] Tencent response: code={:?}", json.get("code"));
            if let Some(code) = json.get("code").and_then(|v| v.as_i64()) {
                if code != 0 {
                    let msg = json.get("msg").and_then(|v| v.as_str()).unwrap_or("Unknown error");
                    return Err(format!("Tencent API error: {} - {}", code, msg));
                }
            }
            // Get data from data.{symbol}.{tf}
            let day_data = json.pointer(&format!("/data/{}/{}", symbol, tf)).and_then(|v| v.as_array());
            eprintln!("[AStock] data length: {:?}", day_data.map(|v| v.len()));
            if let Some(klines) = day_data {
                if klines.is_empty() {
                    return Err("No K-line data returned".to_string());
                }
                let mut results = Vec::new();
                for item in klines {
                    let arr = match item.as_array() {
                        Some(a) => a,
                        None => continue,
                    };
                    // Format: [date, open, close, high, low, volume]
                    if arr.len() < 6 {
                        continue;
                    }
                    let date = arr[0].as_str().unwrap_or("").to_string();
                    let open = arr[1].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                    let close = arr[2].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                    let high = arr[3].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                    let low = arr[4].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                    let volume = arr[5].as_str().and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
                    if date.is_empty() || open <= 0.0 || high <= 0.0 || low <= 0.0 || close <= 0.0 {
                        continue;
                    }
                    results.push(AStockKLine { date, open, high, low, close, volume, amount: 0.0 });
                }
                eprintln!("[AStock] Parsed {} K-lines", results.len());
                if results.is_empty() {
                    return Err("Failed to parse any K-line data".to_string());
                }
                Ok(AStockKLineResponse {
                    success: true,
                    message: format!("Fetched {} K-lines for {}", results.len(), symbol),
                    symbol,
                    name,
                    total: results.len(),
                    data: results,
                })
            } else {
                Err(format!("No K-line data in response: {:?}", json))
            }
        }
        Err(e) => Err(format!("Tencent K-line fetch failed: {}", e)),
    }
}
