const form = document.querySelector(".cta-form");
const canvas = document.querySelector("#voxel-canvas");
const ctx = canvas?.getContext("2d");
const shardsCount = document.querySelector("#shards-count");
const shardsTotal = document.querySelector("#shards-total");
const timer = document.querySelector("#timer");

const state = {
  rotation: Math.PI / 4,
  tilt: Math.PI / 6,
  isDragging: false,
  lastX: 0,
  lastY: 0,
  velocityX: 0,
  velocityY: 0,
  keys: new Set(),
  startTime: null,
};

const palette = {
  floor: "#5f6b8a",
  floorLight: "#8b9ac2",
  wall: "#2b2f3d",
  wallLight: "#414b63",
  player: "#ffb56b",
  playerLight: "#ffe0a3",
  shard: "#d67bff",
  shardLight: "#ffd4ff",
};

const mapSize = 11;
const heightMap = Array.from({ length: mapSize }, (_, z) =>
  Array.from({ length: mapSize }, (_, x) => {
    const edge = x === 0 || z === 0 || x === mapSize - 1 || z === mapSize - 1;
    if (edge) return 4;
    const hill = Math.sin((x + z) * 0.7) * 0.6 + Math.cos(z * 0.5) * 0.4;
    return Math.max(1, Math.round(1 + hill));
  })
);

const shardPositions = [
  { x: 2, z: 2 },
  { x: 8, z: 3 },
  { x: 4, z: 7 },
  { x: 6, z: 5 },
];

const player = {
  x: 5,
  z: 5,
  y: heightMap[5][5],
};

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

const drawCube = (x, y, z, baseColor, lightColor) => {
  if (!ctx) return;
  const projected = project(x, y, z);
  const size = 18 * projected.scale;
  const screenX = canvas.width / 2 + projected.x;
  const screenY = canvas.height / 2 - projected.y;
  const gradient = ctx.createLinearGradient(screenX, screenY - size / 2, screenX, screenY + size / 2);
  gradient.addColorStop(0, lightColor);
  gradient.addColorStop(1, baseColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.strokeRect(screenX - size / 2, screenY - size / 2, size, size);
};

const buildVoxels = () => {
  const voxels = [];
  for (let z = 0; z < mapSize; z += 1) {
    for (let x = 0; x < mapSize; x += 1) {
      const height = heightMap[z][x];
      for (let y = 0; y <= height; y += 1) {
        const isWall = height >= 3;
        voxels.push({
          x: x - mapSize / 2,
          y,
          z: z - mapSize / 2,
          color: isWall ? palette.wall : palette.floor,
          light: isWall ? palette.wallLight : palette.floorLight,
        });
      }
    }
  }
  shardPositions.forEach((shard) => {
    if (!shard.collected) {
      voxels.push({
        x: shard.x - mapSize / 2,
        y: heightMap[shard.z][shard.x] + 1,
        z: shard.z - mapSize / 2,
        color: palette.shard,
        light: palette.shardLight,
      });
    }
  });
  voxels.push({
    x: player.x - mapSize / 2,
    y: player.y + 1,
    z: player.z - mapSize / 2,
    color: palette.player,
    light: palette.playerLight,
  });
  return voxels;
};

const updateHud = () => {
  const collected = shardPositions.filter((shard) => shard.collected).length;
  if (shardsCount) shardsCount.textContent = collected.toString();
  if (shardsTotal) shardsTotal.textContent = shardPositions.length.toString();
  if (timer && state.startTime) {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = String(elapsed % 60).padStart(2, "0");
    timer.textContent = `${minutes}:${seconds}`;
  }
};

const movePlayer = (deltaX, deltaZ) => {
  const nextX = player.x + deltaX;
  const nextZ = player.z + deltaZ;
  if (nextX < 1 || nextZ < 1 || nextX > mapSize - 2 || nextZ > mapSize - 2) {
    return;
  }
  const nextHeight = heightMap[nextZ][nextX];
  if (nextHeight >= 3) {
    return;
  }
  player.x = nextX;
  player.z = nextZ;
  player.y = nextHeight;
  shardPositions.forEach((shard) => {
    if (!shard.collected && shard.x === player.x && shard.z === player.z) {
      shard.collected = true;
    }
  });
};

const handleMovement = () => {
  const speed = state.keys.has("Shift") ? 2 : 1;
  if (state.keys.has("w") || state.keys.has("ArrowUp")) movePlayer(0, -speed);
  if (state.keys.has("s") || state.keys.has("ArrowDown")) movePlayer(0, speed);
  if (state.keys.has("a") || state.keys.has("ArrowLeft")) movePlayer(-speed, 0);
  if (state.keys.has("d") || state.keys.has("ArrowRight")) movePlayer(speed, 0);
};

const renderScene = () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(10, 10, 18, 1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const voxels = buildVoxels();
  voxels.sort((a, b) => project(a.x, a.y, a.z).depth - project(b.x, b.y, b.z).depth);
  voxels.forEach((voxel) => drawCube(voxel.x, voxel.y, voxel.z, voxel.color, voxel.light));

  handleMovement();
  state.rotation += state.velocityX;
  state.tilt += state.velocityY;
  state.velocityX *= 0.9;
  state.velocityY *= 0.9;
  state.tilt = Math.max(Math.min(state.tilt, Math.PI / 3), -Math.PI / 12);

  updateHud();
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

const bindKeyboardControls = () => {
  window.addEventListener("keydown", (event) => {
    state.keys.add(event.key);
    if (!state.startTime) {
      state.startTime = Date.now();
    }
  });
  window.addEventListener("keyup", (event) => {
    state.keys.delete(event.key);
  });
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
  state.startTime = Date.now();
  bindCanvasControls();
  bindKeyboardControls();
  updateHud();
  renderScene();
}
