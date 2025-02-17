const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const cameraType = document.getElementById('cameraType');
const cameraName = document.getElementById('cameraName');
const cameraRadius = document.getElementById('cameraRadius');
const cameraDirection = document.getElementById('cameraDirection');
const addCameraBtn = document.getElementById('addCamera');
const exportPdfBtn = document.getElementById('exportPdf');
const exportPngBtn = document.getElementById('exportPng');
const clearCanvasBtn = document.getElementById('clearCanvas');
const undoCameraBtn = document.getElementById('undoCamera');
const pdfUpload = document.getElementById('pdfUpload');

let cameras = [];
let currentPdf = null;
let currentPage = 1;
let totalPages = 1;
let scale = 1;
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// Initialize canvas size
function initCanvas() {
    canvas.width = window.innerWidth - 340;
    canvas.height = window.innerHeight - 40;
}

// Load PDF document from URL or File
async function loadPdf(source) {
    let loadingTask;
    if (typeof source === 'string') {
        loadingTask = pdfjsLib.getDocument(source);
    } else {
        const arrayBuffer = await source.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    }
    
    try {
        currentPdf = await loadingTask.promise;
        totalPages = currentPdf.numPages;
        updatePageControls();
        renderPage(currentPage);
    } catch (err) {
        console.error('Error loading PDF:', err);
        alert('Error loading PDF. Please check the file format.');
    }
}

// Render PDF page
async function renderPage(pageNum) {
    if (!currentPdf) return;
    
    const page = await currentPdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };
    
    await page.render(renderContext).promise;
    drawCameras();
}

// Draw all cameras
function drawCameras() {
    cameras.forEach(camera => {
        const { x, y, radius, direction, type } = camera;
        
        // Draw camera indicator
        if (type === 'ptz') {
            // Draw 360 degree indicator
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw yellow dot for fixed camera
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'blue';
            ctx.fill();
        } else {
            // Draw red dot
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            
            // Draw direction line
            const angleRad = ((direction - 90) * Math.PI) / 180; // Adjust for canvas coordinate system
            const endX = x + radius * Math.cos(angleRad);
            const endY = y + radius * Math.sin(angleRad);
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw camera name
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(camera.name, x + 10, y - 10);
    });
}

// Add camera to canvas
function addCamera(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    const camera = {
        x,
        y,
        name: cameraName.value || `Camera ${cameras.length + 1}`,
        radius: parseInt(cameraRadius.value) || 50,
        direction: parseInt(cameraDirection.value) || (cameraType.value === 'fixed' ? 135 : 0),
        type: cameraType.value
    };
    
    cameras.push(camera);
    renderPage(currentPage);
}

// Export to PDF
async function exportToPdf() {
    const { jsPDF } = window.jspdf;
    
    // Get current page to determine orientation
    const page = await currentPdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const orientation = viewport.width > viewport.height ? 'l' : 'p';
    
    const doc = new jsPDF(orientation, 'mm', 'a4');
    
    // Convert canvas to image
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions
    const imgWidth = doc.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image to PDF
    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Save the PDF
    doc.save('camera-layout.pdf');
}

// Export to PNG
function exportToPng() {
    html2canvas(canvas).then(canvas => {
        const link = document.createElement('a');
        link.download = 'camera-layout.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}

// Update page navigation controls
function updatePageControls() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// Navigate to previous page
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updatePageControls();
        renderPage(currentPage);
    }
}

// Navigate to next page
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updatePageControls();
        renderPage(currentPage);
    }
}

// Clear canvas
function clearCanvas() {
    cameras = [];
    renderPage(currentPage);
}

// Event Listeners
window.addEventListener('resize', initCanvas);
canvas.addEventListener('click', addCamera);
addCameraBtn.addEventListener('click', addCamera);
exportPdfBtn.addEventListener('click', exportToPdf);
exportPngBtn.addEventListener('click', exportToPng);
clearCanvasBtn.addEventListener('click', clearCanvas);
undoCameraBtn.addEventListener('click', () => {
    if (cameras.length > 0) {
        cameras.pop();
        renderPage(currentPage);
    }
});

// Handle PDF file upload
pdfUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        loadPdf(file);
    } else {
        alert('Please upload a valid PDF file');
    }
});

// Add page navigation event listeners
prevPageBtn.addEventListener('click', prevPage);
nextPageBtn.addEventListener('click', nextPage);

// Initialize
