const form = document.querySelector(".cta-form");
const canvas = document.querySelector("#voxel-canvas");
const ctx = canvas?.getContext("2d");

const state = {
  rotation: Math.PI / 5,
  tilt: Math.PI / 7,
  isDragging: false,
  lastX: 0,
  lastY: 0,
  velocityX: 0,
  velocityY: 0,
};

const voxelPalette = [
  "#5f6b8a",
  "#7482a8",
  "#8b9ac2",
  "#a2b2d8",
  "#ffb56b",
  "#ff8d6b",
  "#483b52",
];

const voxels = [];
for (let x = -4; x <= 4; x += 1) {
  for (let z = -4; z <= 4; z += 1) {
    const height = Math.floor(2 + Math.sin((x + z) * 0.6) * 2 + (x * x + z * z) * 0.08);
    for (let y = 0; y <= height; y += 1) {
      voxels.push({ x, y, z, shade: (x + z + y) % voxelPalette.length });
    }
  }
}

const project = (x, y, z) => {
  const cosY = Math.cos(state.rotation);
  const sinY = Math.sin(state.rotation);
  const cosX = Math.cos(state.tilt);
  const sinX = Math.sin(state.tilt);
  const dx = x * cosY - z * sinY;
  const dz = x * sinY + z * cosY;
  const dy = y * cosX - dz * sinX;
  const depth = y * sinX + dz * cosX + 12;
  const scale = 140 / depth;
  return {
    x: dx * scale,
    y: dy * scale,
    scale,
    depth,
  };
};

const drawCube = (cube) => {
  if (!ctx) return;
  const { x, y, z, shade } = cube;
  const projected = project(x, y, z);
  const size = 16 * projected.scale;
  const screenX = canvas.width / 2 + projected.x;
  const screenY = canvas.height / 2 - projected.y;
  const color = voxelPalette[Math.abs(shade) % voxelPalette.length];
  ctx.fillStyle = color;
  ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.strokeRect(screenX - size / 2, screenY - size / 2, size, size);
};

const renderScene = () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(10, 10, 18, 1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sorted = [...voxels].sort((a, b) => project(a.x, a.y, a.z).depth - project(b.x, b.y, b.z).depth);
  sorted.forEach(drawCube);

  state.rotation += state.velocityX;
  state.tilt += state.velocityY;
  state.velocityX *= 0.92;
  state.velocityY *= 0.92;
  state.tilt = Math.max(Math.min(state.tilt, Math.PI / 3), -Math.PI / 8);

  requestAnimationFrame(renderScene);
};

const bindCanvasControls = () => {
  if (!canvas) return;
  const startDrag = (x, y) => {
    state.isDragging = true;
    state.lastX = x;
    state.lastY = y;
  };

  const moveDrag = (x, y) => {
    if (!state.isDragging) return;
    const deltaX = x - state.lastX;
    const deltaY = y - state.lastY;
    state.rotation += deltaX * 0.01;
    state.tilt += deltaY * 0.008;
    state.velocityX = deltaX * 0.002;
    state.velocityY = deltaY * 0.002;
    state.lastX = x;
    state.lastY = y;
  };

  const endDrag = () => {
    state.isDragging = false;
  };

  canvas.addEventListener("mousedown", (event) => startDrag(event.clientX, event.clientY));
  canvas.addEventListener("mousemove", (event) => moveDrag(event.clientX, event.clientY));
  window.addEventListener("mouseup", endDrag);

  canvas.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    startDrag(touch.clientX, touch.clientY);
  });
  canvas.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  });
  canvas.addEventListener("touchend", endDrag);
};

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = form.querySelector("input").value;
    if (email.trim().length === 0) {
      return;
    }
    form.reset();
    form.querySelector("button").textContent = "Заявка отправлена";
  });
}

if (canvas && ctx) {
  bindCanvasControls();
  renderScene();
}
