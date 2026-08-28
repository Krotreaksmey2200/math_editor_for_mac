// Office JS initialization
Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    console.log("Office.js is ready in Word.");
    initWebSocket();
  }
});

let socket = null;
const statusIndicator = document.getElementById("status-indicator");
const statusText = document.getElementById("status-text");
const equationList = document.getElementById("equation-list");

function updateStatus(connected) {
  if (connected) {
    statusIndicator.className = "status-dot connected";
    statusText.innerText = "Connected to Desktop app";
  } else {
    statusIndicator.className = "status-dot disconnected";
    statusText.innerText = "Disconnected from Desktop app";
  }
}

function logEquation(latex) {
  if (equationList.innerHTML.includes("No equations received yet")) {
    equationList.innerHTML = "";
  }
  const item = document.createElement("div");
  item.className = "equation-item";
  item.innerText = latex;
  equationList.insertBefore(item, equationList.firstChild);
}

function initWebSocket() {
  const wsUrl = "ws://localhost:45678/ws";
  console.log(`Connecting to desktop app at ${wsUrl}...`);
  
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected.");
    updateStatus(true);
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Received data:", data);
      
      if (data.type === "insert_equation") {
        logEquation(data.latex);
        await insertEquationIntoWord(data.base64_image, data.baseline_depth, data.width, data.height, data.svg_base64, data.png_base64, data.mathml);
      }
    } catch (err) {
      console.error("Error parsing socket message:", err);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected. Retrying in 3 seconds...");
    updateStatus(false);
    setTimeout(initWebSocket, 3000);
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

async function insertEquationIntoWord(base64Image, baselineDepth, width, height, svgBase64, pngBase64, mathml) {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    
    let htmlContent = "";
    if (mathml && mathml.trim()) {
      // Native Word Equation Text (MathML)
      htmlContent = mathml;
    } else {
      const hasBoth = svgBase64 && pngBase64;
      const finalPng = hasBoth ? pngBase64 : (base64Image.includes("image/png") ? base64Image : "");
      const finalSvg = hasBoth ? svgBase64 : (base64Image.includes("image/svg") ? base64Image : "");
      
      const styleString = `width: ${width}pt; height: ${height}pt;`;
      const wrapperStyle = `mso-text-raise: -${baselineDepth}pt; vertical-align: -${baselineDepth}pt;`;
      if (finalPng && finalSvg) {
        htmlContent = `<span style="${wrapperStyle}"><picture><source srcset="${finalSvg}" type="image/svg+xml"><img src="${finalPng}" width="${width}" height="${height}" style="${styleString}" /></picture></span>`;
      } else {
        const fallbackUrl = base64Image.startsWith("data:") ? base64Image : `data:image/png;base64,${base64Image}`;
        htmlContent = `<span style="${wrapperStyle}"><img src="${fallbackUrl}" width="${width}" height="${height}" style="${styleString}" /></span>`;
      }
    }
    
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
<!--StartFragment-->
${htmlContent}
<!--EndFragment-->
</body>
</html>`;
    
    range.insertHtml(html, Word.InsertLocation.replace);
    
    await context.sync();
    console.log("Equation inserted successfully.");
  });
}
