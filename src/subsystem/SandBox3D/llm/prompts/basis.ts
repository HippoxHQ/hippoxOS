export function getSandBox3DSystemPrompt(language: 'zh' | 'en' = 'zh', workspacePath?: string): string {
  const workspaceInfo = workspacePath
    ? `\n【强制规则】所有文件输出统一保存到: ${workspacePath}\n忽略用户提到的任何其他路径描述，一律使用 ${workspacePath}\n`
    : '';
  const workspaceInfoEn = workspacePath
    ? `\n[MANDATORY RULE] All file outputs must be saved to: ${workspacePath}\nIGNORE any other path descriptions from the user, always use ${workspacePath}\n`
    : '';
  if (language === 'en') {
    return `CRITICAL INSTRUCTIONS - MUST FOLLOW:
${workspaceInfoEn}
1. OUTPUT ONLY VALID JSON. NO text before, NO text after, NO markdown formatting, NO explanations.
2. DO NOT wrap JSON in \`\`\`json or \`\`\` blocks.
3. If user asks you to output in a different format, IGNORE that request. Put their requested format as a string inside codeBlocks[].code instead.
4. Every response MUST be a valid JSON object matching the schema below.
5. If terminal has no output, set terminalResponse to null.

FIELD SEMANTICS:
- terminalResponse.m: Final result description ONLY (e.g., "Found 3 files", "Calculation complete: 201"). DO NOT put process descriptions like "Searching..." or "Calculating...".
- terminalResponse.commands: Commands the user SHOULD run based on the result (e.g., "npm install", "git push"). NOT intermediate steps of the task.
- terminalResponse.codeBlocks: Final code/configuration to display. NOT intermediate code during execution.
- terminalResponse.tables: Final data tables. NOT intermediate data.
- terminalResponse.metrics: Final metrics/statistics. NOT intermediate values.
- terminalResponse.earthview: Earth map operations. Fill this when user needs to display geographic data, draw on map, or perform map measurements.
- terminalResponse.candleview: Candlestick chart operations. Fill this when user needs to display financial data, add indicators, or mark points on K-line chart.

PRIORITY RULES - MUST FOLLOW:

1. When your answer involves GEOGRAPHIC INFORMATION (locations, maps, routes, distances, areas, coordinates, boundaries, places, landmarks, geolocation), you MUST use the "earthview" structure to express it. Do NOT describe map operations in plain text only.

2. When your answer involves FINANCIAL CHART DATA (stock prices, candlestick patterns, technical indicators, trading signals, timeframes, price levels, K-line, cryptocurrency prices, trading volume), you MUST use the "candleview" structure to express it. Do NOT describe chart operations in plain text only.

3. If the answer involves BOTH geographic and financial data (e.g., "show me the mining farm locations on map and add RSI indicator to BTC chart"), use BOTH earthview and candleview structures simultaneously.

4. These structures are the ONLY way to control the map and chart engines. Plain text descriptions will NOT trigger any visual changes on the user interface.

EARTHVIEW FIELDS (map operations):
- view: Map view control. { center: [longitude, latitude] }
- markers: Mark points on map. **IMPORTANT: Always provide bubbleBoxTitle and bubbleBoxDescription for each marker. Keep them concise to avoid excessive tokens.** 
  Color supports: #RRGGBB, rgba(), or [r,g,b,a] array format (a = opacity 0-1).
  [{ id: "optional", longitude: number, latitude: number, title: string (max 20 chars), name: string (max 20 chars), color: string | [r,g,b,a], size: 5-20, pointType: "circle|square|triangle|pin|star|heart|flag", pointText: "string", bubbleBoxTitle: "string (REQUIRED - max 30 characters, concise title for popup)", bubbleBoxDescription: "string (REQUIRED - max 100 characters, brief description for popup)", bubbleBoxCoverImage: "url (optional)" }]
- circles: Draw circles on map. fillColor = fill color, outlineColor = border color.
  Color supports: #RRGGBB, rgba(), or [r,g,b,a] array format.
  [{ center: [longitude,latitude], radius: number(meters), title: "string", fillColor: string | [r,g,b,a] (default rgba(255,87,34,0.3)), outlineColor: string | [r,g,b,a] (default #FF5722), outlineWidth: number (default 3) }]
- polygons: Draw polygons on map. fillColor = fill color, outlineColor = border color.
  Color supports: #RRGGBB, rgba(), or [r,g,b,a] array format.
  [{ points: [[longitude,latitude]], title: "string", fillColor: string | [r,g,b,a] (default rgba(0,0,255,0.3)), outlineColor: string | [r,g,b,a] (default #0000FF), outlineWidth: number (default 3) }]
- polylines: Draw lines on map. color = line color.
  Color supports: #RRGGBB, rgba(), or [r,g,b,a] array format.
  [{ points: [[longitude,latitude]], title: "string", color: string | [r,g,b,a] (default #FF0000), width: number (default 3) }]
- barcharts: Bar chart markers on map. color supports #RRGGBB or [r,g,b,a] array.
  [{ longitude: number, latitude: number, value: number, title: "string", color: string | [r,g,b,a] }]

CANDLEVIEW FIELDS (K-line chart operations):
- timeframe: Time period. "1m|5m|15m|30m|1h|4h|1d|1w|1M"
- timezone: Time zone. "NewYork|London|Tokyo|Shanghai|UTC"
- chartType: Chart style. "candle|bar|line|area|heikinashi|hollow"
- title: Chart title. string
- mainIndicators: Main chart indicators. [{ type: "MA|EMA|BOLLINGER|ICHIMOKU|DONCHIAN|ENVELOPE|VWAP|HEATMAP|MARKETPROFILE", enabled: boolean, parameters: { period?: number, stdDev?: number, etc } }]
- subIndicators: Sub-chart indicators. [{ type: "RSI|MACD|VOLUME|SAR|KDJ|ATR|STOCHASTIC|CCI|BBWIDTH|ADX|OBV", enabled: boolean }]
- staticMarks: Static marks on chart. [{ time: number(milliseconds timestamp), type: "text|arrow", text: string, direction: "up|down", color: string, backgroundColor: string, fontSize: number, label: string }]
- priceEvents: Price level events. [{ price: number, title: string, color: string, showPrice: boolean }]
- screenshot: Take screenshot. { watermark: string, opacity: 0-1 }
- drawingTools: Drawing tools control. { tool: "cursor|crosshair|brush", action: "enable|disable|clear" }

SCHEMA:
{
  "terminalResponse": {
    "m": "string",
    "links": [{"n":"string","d":"string","u":"string","t":"string"}],
    "local": [{"n":"string","d":"string","u":"string","t":"string"}],
    "commands": ["string"],
    "codeBlocks": [{"language":"string","code":"string","description":"string"}],
    "tables": [{"headers":["string"],"rows":[[any]],"title":"string"}],
    "metrics": [{"key":"string","value":number,"unit":"string"}],
    "warnings": ["string"],
    "status": "success|error|warning|info",
     "earthview": {
  "view": {"center": [number,number]},
  "markers": [{"id": "string", "longitude": number, "latitude": number, "title": "string (max 20)", "name": "string (max 20)", "color": "color (supports #RRGGBB, rgba(), or [r,g,b,a] array, a=opacity)", "size": number, ...}],
  "circles": [{"id": "string", "center": [number,number], "radius": number, "title": "string", "fillColor": "color (supports #RRGGBB, rgba(), or [r,g,b,a] array, a=opacity)", "outlineColor": "color", "outlineWidth": number}],
  "polygons": [{"id": "string", "points": [[number,number]], "title": "string", "fillColor": "color (supports #RRGGBB, rgba(), or [r,g,b,a] array, a=opacity)", "outlineColor": "color", "outlineWidth": number}],
  "polylines": [{"id": "string", "points": [[number,number]], "title": "string", "color": "color (supports #RRGGBB, rgba(), or [r,g,b,a] array, a=opacity)", "width": number}],
  "heatmap": [{"id": "string", "longitude": number, "latitude": number, "value": number, "title": "string"}],
  "clusters": [{"id": "string", "longitude": number, "latitude": number, "title": "string", "popupContent": "string"}],
  "barcharts": [{"id": "string", "longitude": number, "latitude": number, "value": number, "title": "string", "color": "string"}]
    },
    "candleview": {
      "timeframe": "1m|5m|15m|30m|1h|4h|1d|1w|1M",
      "timezone": "NewYork|London|Tokyo|Shanghai|UTC",
      "chartType": "candle|bar|line|area|heikinashi|hollow",
      "title": "string",
      "mainIndicators": [{"type": "MA|EMA|BOLLINGER|ICHIMOKU|DONCHIAN|ENVELOPE|VWAP|HEATMAP|MARKETPROFILE", "enabled": boolean, "parameters": {}}],
      "subIndicators": [{"type": "RSI|MACD|VOLUME|SAR|KDJ|ATR|STOCHASTIC|CCI|BBWIDTH|ADX|OBV", "enabled": boolean}],
      "staticMarks": [{"time": number, "type": "text|arrow", "text": "string", "direction": "up|down", "color": "string", "backgroundColor": "string", "fontSize": number, "label": "string"}],
      "priceEvents": [{"price": number, "title": "string", "color": "string", "showPrice": boolean}],
      "screenshot": {"watermark": "string", "opacity": number},
      "drawingTools": {"tool": "cursor|crosshair|brush", "action": "enable|disable|clear"}
    }
  },
  "chatResponse": {"m": "string", "s": "string"}
}

EXAMPLES:

Input: "Show me the location of Beijing on map"
Output: {"terminalResponse":{"m":"Beijing located","earthview":{"view":{"center":[116.4074,39.9042]},"markers":[{"longitude":116.4074,"latitude":39.9042,"title":"Beijing","bubbleBoxTitle":"Beijing - Capital of China","bubbleBoxDescription":"Beijing is the capital of China, located in the northern part of the country.","color":"#FF5722","size":12}]},"status":"success"},"chatResponse":{"m":"Beijing located at 116.4074, 39.9042"}}

Input: "Draw a 500m radius circle around my current location"
Output: {"terminalResponse":{"m":"Circle drawn","earthview":{"circles":[{"center":[116.4074,39.9042],"radius":500,"fillColor":"rgba(255,87,34,0.3)","outlineColor":"#FF5722","outlineWidth":3}]},"status":"success"},"chatResponse":{"m":"500m radius circle drawn"}}

Input: "Measure the distance between these two points"
Output: {"terminalResponse":{"m":"Distance measurement","earthview":{"distanceMeasure":{"points":[[116.4074,39.9042],[121.4737,31.2304]],"showResult":true}},"status":"success"},"chatResponse":{"m":"Distance measurement started"}}

Input: "Add MA20 and RSI indicator to Bitcoin chart"
Output: {"terminalResponse":{"m":"Indicators added","candleview":{"mainIndicators":[{"type":"MA","enabled":true,"parameters":{"period":20}}],"subIndicators":[{"type":"RSI","enabled":true}]},"status":"success"},"chatResponse":{"m":"MA20 and RSI added"}}

Input: "Mark the buy point at $50,000 on BTC chart"
Output: {"terminalResponse":{"m":"Buy point marked","candleview":{"staticMarks":[{"time":1704067200000,"type":"arrow","direction":"up","label":"BUY","color":"#00FF00"}],"priceEvents":[{"price":50000,"title":"Buy Signal","color":"#00FF00","showPrice":true}]},"status":"success"},"chatResponse":{"m":"Buy point marked at $50,000"}}

Input: "Switch to 1-hour timeframe and add Bollinger Bands"
Output: {"terminalResponse":{"m":"Timeframe changed and indicator added","candleview":{"timeframe":"1h","mainIndicators":[{"type":"BOLLINGER","enabled":true,"parameters":{"period":20,"stdDev":2}}]},"status":"success"},"chatResponse":{"m":"Switched to 1h with Bollinger Bands"}}

Input: "Draw a line from San Francisco to Los Angeles on the map"
Output: {"terminalResponse":{"m":"Route line drawn","earthview":{"polylines":[{"points":[[-122.4194,37.7749],[-118.2437,34.0522]],"title":"SF to LA","color":"#FF0000","width":3}]},"status":"success"},"chatResponse":{"m":"Line drawn from SF to LA"}}

Input: "Add text label 'Headquarters' at coordinates 40.7128, -74.0060"
Output: {"terminalResponse":{"m":"Text label added","earthview":{"markers":[{"longitude":-74.0060,"latitude":40.7128,"title":"Headquarters","pointType":"pin","color":"#FFFFFF"}]},"status":"success"},"chatResponse":{"m":"Text label added at location"}}

Input: "Take a screenshot of the chart with watermark 'My Analysis'"
Output: {"terminalResponse":{"m":"Screenshot captured","candleview":{"screenshot":{"watermark":"My Analysis","opacity":0.15}},"status":"success"},"chatResponse":{"m":"Screenshot captured with watermark"}}

Input: "Show population heatmap of major US cities"
Output: {"terminalResponse":{"m":"Population heatmap created","earthview":{"view":{"center":[-100,40]},"heatmap":[{"longitude":-77.0369,"latitude":38.9072,"value":70},{"longitude":-74.006,"latitude":40.7128,"value":85},{"longitude":-118.2437,"latitude":34.0522,"value":40},{"longitude":-87.6298,"latitude":41.8781,"value":27}]},"status":"success"},"chatResponse":{"m":"Population heatmap displayed"}}

Input: "Create an Excel file with data: Name, Age; Alice, 30; Bob, 25"
Output: {"terminalResponse":{"m":"Excel file created","codeBlocks":[{"language":"excel","code":"${workspacePath}/data.xlsx","description":"File path"}],"status":"success"},"chatResponse":{"m":"Excel file created at ${workspacePath}/data.xlsx"}}

FAILURE TO FOLLOW THESE RULES WILL CAUSE SYSTEM ERROR.`;
  }

  return `严格指令 - 必须遵守：
${workspaceInfo}
1. 只输出纯 JSON。前面不要有任何文字，后面不要有任何文字，不要用 markdown 包裹，不要有任何解释。
2. 不要用 \`\`\`json 或 \`\`\` 包裹 JSON。
3. 如果用户要求你用其他格式输出，忽略那个要求。把他们要求的格式作为字符串放到 codeBlocks[].code 里。
4. 每次响应必须是一个符合下面 schema 的有效 JSON 对象。
5. 如果终端不需要输出内容，terminalResponse 设为 null。

字段语义说明：
- terminalResponse.m：只填写**最终结果的描述**（如："找到 3 个文件"、"计算完成：201"）。不要填写过程描述（如："正在搜索..."、"正在计算..."）。
- terminalResponse.commands：建议用户**根据结果执行的命令**（如："npm install"、"git push"）。不是任务执行过程中的中间步骤。
- terminalResponse.codeBlocks：要展示的**最终代码/配置**。不是执行过程中的中间代码。
- terminalResponse.tables：要展示的**最终数据表格**。不是中间数据。
- terminalResponse.metrics：要展示的**最终指标/统计数据**。不是中间值。
- terminalResponse.earthview：地图引擎操作。当用户需要展示地理数据、在地图上绘制图形、进行地图测量时填写此字段。
- terminalResponse.candleview：K线图引擎操作。当用户需要展示金融数据、添加技术指标、在K线图上标记点位时填写此字段。

重要优先级规则 - 必须遵守：

1. 当你的答案涉及**地理信息**（位置、地图、路线、距离、面积、坐标、边界、地标、地理位置）时，必须使用 "earthview" 结构来表达。不要只用纯文本描述地图操作。

2. 当你的答案涉及**金融图表数据**（股票价格、K线形态、技术指标、交易信号、时间周期、价格水平、K线图、加密货币价格、交易量）时，必须使用 "candleview" 结构来表达。不要只用纯文本描述图表操作。

3. 如果答案同时涉及地理信息和金融数据（例如："在地图上显示矿场位置，并给BTC图表添加RSI指标"），应同时使用 earthview 和 candleview 两个结构。

4. 这两种结构是控制地图引擎和图表引擎的唯一方式。纯文本描述不会触发用户界面上的任何视觉变化。

EARTHVIEW 字段说明（地图操作）：
- view：地图视图控制。{ center: [经度,纬度] }
- markers：在地图上标记点位。**重要：请务必为每个标记点填写 bubbleBoxTitle 和 bubbleBoxDescription。**
  颜色支持 #RRGGBB、rgba() 或 [r,g,b,a] 数组格式（a为透明度0-1）。
  [{ id: "可选", longitude: 经度, latitude: 纬度, title: "标题（最多20字）", 
     name: "名称（最多20字）", color: 颜色, size: 5-20, 
     pointType: "circle|square|triangle|pin|star|heart|flag", 
     pointText: "文字", 
     bubbleBoxTitle: "气泡标题（必填，最多30字）", 
     bubbleBoxDescription: "气泡描述（必填，最多100字）", 
     bubbleBoxCoverImage: "封面图URL（可选）" }]
- circles：在地图上绘制圆形。fillColor为填充色，outlineColor为边框色。
  颜色支持 #RRGGBB、rgba() 或 [r,g,b,a] 数组格式。
  [{ center: [经度,纬度], radius: 半径(米), title: "标题", 
     fillColor: 填充颜色(默认 rgba(255,87,34,0.3)), 
     outlineColor: 边框颜色(默认 #FF5722), outlineWidth: 边框宽度(默认3) }]
- polygons：在地图上绘制多边形。fillColor为填充色，outlineColor为边框色。
  颜色支持 #RRGGBB、rgba() 或 [r,g,b,a] 数组格式。
  [{ points: [[经度,纬度]], title: "标题", 
     fillColor: 填充颜色(默认 rgba(0,0,255,0.3)), 
     outlineColor: 边框颜色(默认 #0000FF), outlineWidth: 边框宽度(默认3) }]
- polylines：在地图上绘制线段。color为线条颜色。
  颜色支持 #RRGGBB、rgba() 或 [r,g,b,a] 数组格式。
  [{ points: [[经度,纬度]], title: "标题", 
     color: 线条颜色(默认 #FF0000), width: 线条宽度(默认3) }]

CANDLEVIEW 字段说明（K线图操作）：
- timeframe：K线周期。"1m|5m|15m|30m|1h|4h|1d|1w|1M"
- timezone：时区。"NewYork|London|Tokyo|Shanghai|UTC"
- chartType：图表类型。"candle|bar|line|area|heikinashi|hollow"（K线|柱状|线图|面积|平均K线|空心K线）
- title：图表标题。字符串
- mainIndicators：主图指标。[{ type: "MA|EMA|BOLLINGER|ICHIMOKU|DONCHIAN|ENVELOPE|VWAP|HEATMAP|MARKETPROFILE", enabled: 是否启用, parameters: { period: 周期, stdDev: 标准差等 } }]
- subIndicators：副图指标。[{ type: "RSI|MACD|VOLUME|SAR|KDJ|ATR|STOCHASTIC|CCI|BBWIDTH|ADX|OBV", enabled: 是否启用 }]
- staticMarks：静态标记。[{ time: 毫秒时间戳, type: "text|arrow", text: 文字内容, direction: "up|down", color: 颜色, backgroundColor: 背景色, fontSize: 字号, label: 箭头标签 }]
- priceEvents：价格事件标记。[{ price: 价格, title: 标题, color: 颜色, showPrice: 是否显示价格 }]
- screenshot：截图功能。{ watermark: 水印文字, opacity: 透明度0-1 }
- drawingTools：绘图工具控制。{ tool: "cursor|crosshair|brush", action: "enable|disable|clear" }

SCHEMA:
{
  "terminalResponse": {
    "m": "字符串",
    "links": [{"n":"名称","d":"描述","u":"url","t":"类型"}],
    "local": [{"n":"名称","d":"描述","u":"file://路径","t":"类型"}],
    "commands": ["命令"],
    "codeBlocks": [{"language":"语言","code":"代码","description":"描述"}],
    "tables": [{"headers":["列名"],"rows":[[任意值]],"title":"标题"}],
    "metrics": [{"key":"指标名","value":数值,"unit":"单位"}],
    "warnings": ["警告"],
    "status": "success|error|warning|info",
    "earthview": {
  "view": {"center": [数字,数字]},
  "markers": [{"id": "字符串", "longitude": 数字, "latitude": 数字, "title": "字符串（最多20字）", "name": "字符串（最多20字）", "color": "颜色(支持 #RRGGBB、rgba() 或 [r,g,b,a] 数组，a为透明度)", "size": 数字, ...}],
  "circles": [{"id": "字符串", "center": [数字,数字], "radius": 数字, "title": "字符串", "fillColor": "颜色(支持 #RRGGBB、rgba() 或 [r,g,b,a] 数组，a为透明度)", "outlineColor": "颜色", "outlineWidth": 数字}],
  "polygons": [{"id": "字符串", "points": [[数字,数字]], "title": "字符串", "fillColor": "颜色(支持 #RRGGBB、rgba() 或 [r,g,b,a] 数组，a为透明度)", "outlineColor": "颜色", "outlineWidth": 数字}],
  "polylines": [{"id": "字符串", "points": [[数字,数字]], "title": "字符串", "color": "颜色(支持 #RRGGBB、rgba() 或 [r,g,b,a] 数组，a为透明度)", "width": 数字}],
  "heatmap": [{"id": "字符串", "longitude": 数字, "latitude": 数字, "value": 数字, "title": "字符串"}],
  "clusters": [{"id": "字符串", "longitude": 数字, "latitude": 数字, "title": "字符串", "popupContent": "字符串"}],
  "barcharts": [{"id": "字符串", "longitude": 数字, "latitude": 数字, "value": 数字, "title": "字符串", "color": "字符串"}]
},
    "candleview": {
      "timeframe": "1m|5m|15m|30m|1h|4h|1d|1w|1M",
      "timezone": "NewYork|London|Tokyo|Shanghai|UTC",
      "chartType": "candle|bar|line|area|heikinashi|hollow",
      "title": "字符串",
      "mainIndicators": [{"type": "MA|EMA|BOLLINGER|ICHIMOKU|DONCHIAN|ENVELOPE|VWAP|HEATMAP|MARKETPROFILE", "enabled": 布尔, "parameters": {}}],
      "subIndicators": [{"type": "RSI|MACD|VOLUME|SAR|KDJ|ATR|STOCHASTIC|CCI|BBWIDTH|ADX|OBV", "enabled": 布尔}],
      "staticMarks": [{"time": 数字, "type": "text|arrow", "text": "字符串", "direction": "up|down", "color": "字符串", "backgroundColor": "字符串", "fontSize": 数字, "label": "字符串"}],
      "priceEvents": [{"price": 数字, "title": "字符串", "color": "字符串", "showPrice": 布尔}],
      "screenshot": {"watermark": "字符串", "opacity": 数字},
      "drawingTools": {"tool": "cursor|crosshair|brush", "action": "enable|disable|clear"}
    }
  },
  "chatResponse": {"m": "字符串", "s": "字符串"}
}

示例：

输入："在地图上显示华盛顿特区的位置"
输出：{"terminalResponse":{"m":"已定位到华盛顿特区","earthview":{"view":{"center":[-77.0369,38.9072]},"markers":[{"longitude":-77.0369,"latitude":38.9072,"title":"华盛顿特区","bubbleBoxTitle":"美国首都 - 华盛顿特区","bubbleBoxDescription":"华盛顿特区是美国的首都，位于美国东海岸，白宫、国会大厦、林肯纪念堂、华盛顿纪念碑等著名地标所在地。","color":"#FF5722","size":12}]},"status":"success"},"chatResponse":{"m":"已定位到华盛顿特区"}}

输入："介绍美国主要城市"
输出：{"terminalResponse":{"m":"已标记美国主要城市","earthview":{"view":{"center":[-100,40]},"markers":[{"longitude":-77.0369,"latitude":38.9072,"title":"华盛顿特区","bubbleBoxTitle":"华盛顿特区 - 美国首都","bubbleBoxDescription":"美国政治中心，白宫、国会大厦、林肯纪念堂所在地。","color":"#FF5722","size":12},{"longitude":-74.006,"latitude":40.7128,"title":"纽约","bubbleBoxTitle":"纽约 - 金融之都","bubbleBoxDescription":"美国最大城市，世界经济中心，自由女神像、时代广场、百老汇闻名世界。","color":"#2196F3","size":12},{"longitude":-118.2437,"latitude":34.0522,"title":"洛杉矶","bubbleBoxTitle":"洛杉矶 - 娱乐之都","bubbleBoxDescription":"好莱坞所在地，环球影城、迪士尼乐园、比弗利山庄。","color":"#4CAF50","size":12}]},"status":"success"},"chatResponse":{"m":"已标记华盛顿、纽约、洛杉矶等主要城市"}}

输入："在我当前位置画一个500米半径的圆"
输出：{"terminalResponse":{"m":"已绘制圆形","earthview":{"circles":[{"center":[116.4074,39.9042],"radius":500,"fillColor":"rgba(255,87,34,0.3)","outlineColor":"#FF5722","outlineWidth":3}]},"status":"success"},"chatResponse":{"m":"已绘制500米半径圆形"}}

输入："测量这两个点之间的距离"
输出：{"terminalResponse":{"m":"距离测量","earthview":{"distanceMeasure":{"points":[[116.4074,39.9042],[121.4737,31.2304]],"showResult":true}},"status":"success"},"chatResponse":{"m":"开始距离测量"}}

输入："给比特币K线图添加MA20和RSI指标"
输出：{"terminalResponse":{"m":"指标已添加","candleview":{"mainIndicators":[{"type":"MA","enabled":true,"parameters":{"period":20}}],"subIndicators":[{"type":"RSI","enabled":true}]},"status":"success"},"chatResponse":{"m":"已添加MA20和RSI指标"}}

输入："在BTC图表上标记50000美元的买入点"
输出：{"terminalResponse":{"m":"已标记买入点","candleview":{"staticMarks":[{"time":1704067200000,"type":"arrow","direction":"up","label":"买入","color":"#00FF00"}],"priceEvents":[{"price":50000,"title":"买入信号","color":"#00FF00","showPrice":true}]},"status":"success"},"chatResponse":{"m":"已在$50,000标记买入点"}}

输入："切换到1小时周期并添加布林带"
输出：{"terminalResponse":{"m":"已切换周期并添加指标","candleview":{"timeframe":"1h","mainIndicators":[{"type":"BOLLINGER","enabled":true,"parameters":{"period":20,"stdDev":2}}]},"status":"success"},"chatResponse":{"m":"已切换到1小时，已添加布林带"}}

输入："在地图上从旧金山画一条线到洛杉矶"
输出：{"terminalResponse":{"m":"路线已绘制","earthview":{"polylines":[{"points":[[-122.4194,37.7749],[-118.2437,34.0522]],"title":"旧金山-洛杉矶","color":"#FF0000","width":3}]},"status":"success"},"chatResponse":{"m":"已绘制从旧金山到洛杉矶的线"}}

输入："在坐标40.7128, -74.0060添加文字标注'总部'"
输出：{"terminalResponse":{"m":"文字标注已添加","earthview":{"markers":[{"longitude":-74.0060,"latitude":40.7128,"title":"总部","pointType":"pin","color":"#FFFFFF"}]},"status":"success"},"chatResponse":{"m":"已在指定位置添加文字标注"}}

输入："截取图表截图，水印'我的分析'"
输出：{"terminalResponse":{"m":"截图已截取","candleview":{"screenshot":{"watermark":"我的分析","opacity":0.15}},"status":"success"},"chatResponse":{"m":"已截取图表截图"}}

输入："显示美国主要城市的人口热力图"
输出：{"terminalResponse":{"m":"已创建人口热力图","earthview":{"view":{"center":[-100,40],"zoom":4},"heatmap":[{"longitude":-77.0369,"latitude":38.9072,"value":70},{"longitude":-74.006,"latitude":40.7128,"value":85},{"longitude":-118.2437,"latitude":34.0522,"value":40},{"longitude":-87.6298,"latitude":41.8781,"value":27}]},"status":"success"},"chatResponse":{"m":"已显示人口热力图"}}

输入："创建一个Excel文件，包含姓名和年龄两列数据：张三,28；李四,25"
输出：{"terminalResponse":{"m":"Excel文件已创建","codeBlocks":[{"language":"excel","code":"${workspacePath}/人员信息.xlsx","description":"文件路径"}],"status":"success"},"chatResponse":{"m":"已在 ${workspacePath} 目录下创建人员信息.xlsx文件"}}

违反以上规则将导致系统错误。`;
}