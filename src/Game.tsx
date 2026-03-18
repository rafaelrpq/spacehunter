import React, { useEffect, useRef } from 'react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const ROOMS = {
  overworld: {
    color: '#1a1a1a',
    obstacles: [
      { x: 200, y: 150, width: 100, height: 100, color: '#444' },
      { x: 500, y: 300, width: 150, height: 50, color: '#444' },
      { x: 100, y: 400, width: 50, height: 150, color: '#444' },
    ],
    enemies: [
      { x: 600, y: 100, width: 30, height: 30, color: '#ffaa00', health: 3, maxHealth: 3, vx: 1, vy: 1 },
    ],
    exits: {
      right: 'dungeon_entry'
    },
    powerups: []
  },
  dungeon_entry: {
    color: '#2a1a2a',
    obstacles: [
      { x: 0, y: 0, width: 800, height: 50, color: '#553355' },
      { x: 0, y: 550, width: 800, height: 50, color: '#553355' },
      { x: 300, y: 200, width: 200, height: 200, color: '#553355' },
    ],
    enemies: [
      { x: 100, y: 100, width: 30, height: 30, color: '#ff00ff', health: 5, maxHealth: 5, vx: 2, vy: 2 },
      { x: 600, y: 500, width: 30, height: 30, color: '#ff00ff', health: 5, maxHealth: 5, vx: -2, vy: -2 },
    ],
    exits: {
      left: 'overworld'
    },
    powerups: [
      { x: 400, y: 100, type: 'speed', color: '#ffff00', collected: false }
    ]
  }
};

interface Keys {
  [key: string]: boolean;
}

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Keys>({});
  
  // Player state
  const playerRef = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    z: 0, // For jumping
    vz: 0, // Vertical velocity for jump
    width: 32,
    height: 32,
    speed: 4,
    color: '#00ffcc',
    isJumping: false,
    direction: { x: 0, y: 1 }, // Last movement direction
  });

  const [currentRoomKey, setCurrentRoomKey] = React.useState<keyof typeof ROOMS>('overworld');
  const projectilesRef = useRef<any[]>([]);
  const enemiesRef = useRef<any[]>([]);
  const obstaclesRef = useRef<any[]>([]);
  const powerupsRef = useRef<any[]>([]);

  useEffect(() => {
    // Load room data when room changes
    const room = ROOMS[currentRoomKey];
    obstaclesRef.current = [...room.obstacles];
    // Create new enemies instead of sharing references
    enemiesRef.current = room.enemies.map(e => ({ ...e }));
    powerupsRef.current = (room as any).powerups.map((p: any) => ({ ...p }));
    projectilesRef.current = [];
  }, [currentRoomKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space' && !playerRef.current.isJumping) {
        playerRef.current.vz = 8;
        playerRef.current.isJumping = true;
      }
      if (e.code === 'KeyZ' || e.code === 'Enter') {
        shoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const shoot = () => {
    const player = playerRef.current;
    
    let dx = 0;
    let dy = 0;

    if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) dy -= 1;
    if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) dy += 1;
    if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) dx -= 1;
    if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) dx += 1;

    if (dx === 0 && dy === 0) {
      dx = player.direction.x;
      dy = player.direction.y;
    }

    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
    }

    projectilesRef.current.push({
      x: player.x,
      y: player.y - player.z,
      vx: dx * 7,
      vy: dy * 7,
      radius: 4,
      color: '#ff0055',
      life: 100,
    });
  };

  const checkCollision = (x: number, y: number, w: number, h: number) => {
    for (const obs of obstaclesRef.current) {
      if (
        x + w/2 > obs.x &&
        x - w/2 < obs.x + obs.width &&
        y + h/2 > obs.y &&
        y - h/2 < obs.y + obs.height
      ) {
        return true;
      }
    }
    return false;
  };

  const update = () => {
    const player = playerRef.current;
    const keys = keysRef.current;
    const room = ROOMS[currentRoomKey];

    // Movement
    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const mag = Math.sqrt(dx * dx + dy * dy);
      const moveX = (dx / mag) * player.speed;
      const moveY = (dy / mag) * player.speed;
      
      if (!checkCollision(player.x + moveX, player.y, player.width, player.height)) {
        player.x += moveX;
      }
      if (!checkCollision(player.x, player.y + moveY, player.width, player.height)) {
        player.y += moveY;
      }
      player.direction = { x: dx / mag, y: dy / mag };
    }

    // Jump
    if (player.isJumping) {
      player.z += player.vz;
      player.vz -= 0.5;
      if (player.z <= 0) {
        player.z = 0;
        player.vz = 0;
        player.isJumping = false;
      }
    }

    // Room Transitions
    if (player.x > CANVAS_WIDTH && (room.exits as any).right) {
      setCurrentRoomKey((room.exits as any).right);
      player.x = 20;
    } else if (player.x < 0 && (room.exits as any).left) {
      setCurrentRoomKey((room.exits as any).left);
      player.x = CANVAS_WIDTH - 20;
    } else {
      player.x = Math.max(0, Math.min(CANVAS_WIDTH, player.x));
      player.y = Math.max(0, Math.min(CANVAS_HEIGHT, player.y));
    }

    // Enemies
    enemiesRef.current.forEach(enemy => {
      if (checkCollision(enemy.x + enemy.vx, enemy.y, enemy.width, enemy.height) || 
          enemy.x + enemy.vx < 0 || enemy.x + enemy.vx > CANVAS_WIDTH - enemy.width) {
        enemy.vx *= -1;
      }
      if (checkCollision(enemy.x, enemy.y + enemy.vy, enemy.width, enemy.height) || 
          enemy.y + enemy.vy < 0 || enemy.y + enemy.vy > CANVAS_HEIGHT - enemy.height) {
        enemy.vy *= -1;
      }
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;
    });

    // Projectiles
    projectilesRef.current = projectilesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      for (const enemy of enemiesRef.current) {
        if (p.x > enemy.x && p.x < enemy.x + enemy.width &&
            p.y > enemy.y && p.y < enemy.y + enemy.height) {
          enemy.health--;
          return false;
        }
      }

      if (checkCollision(p.x, p.y, p.radius, p.radius)) return false;

      return p.life > 0 && p.x > 0 && p.x < CANVAS_WIDTH && p.y > 0 && p.y < CANVAS_HEIGHT;
    });

    enemiesRef.current = enemiesRef.current.filter(e => e.health > 0);

    // Powerups
    powerupsRef.current.forEach(p => {
      if (!p.collected) {
        const dist = Math.sqrt((player.x - p.x)**2 + (player.y - p.y)**2);
        if (dist < 30) {
          p.collected = true;
          if (p.type === 'speed') player.speed = 7;
        }
      }
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const room = ROOMS[currentRoomKey];
    ctx.fillStyle = room.color;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    const player = playerRef.current;

    obstaclesRef.current.forEach(obs => {
      ctx.fillStyle = obs.color;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeStyle = '#222';
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    });

    enemiesRef.current.forEach(enemy => {
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 4);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(enemy.x, enemy.y - 10, (enemy.health / (enemy.maxHealth || 3)) * enemy.width, 4);
    });

    powerupsRef.current.forEach(p => {
      if (!p.collected) {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.stroke();
      }
    });

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y, player.width / 2, player.height / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2 - player.z, player.width, player.height);

    projectilesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    });
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('WASD: Mover | SPACE: Pular | Z/ENTER: Atirar', 20, 30);
    ctx.fillText(`Inimigos: ${enemiesRef.current.length}`, 20, 55);
    if (player.speed > 4) ctx.fillText('POWER-UP: VELOCIDADE!', 20, 80);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    const render = () => {
      update();
      draw(ctx);
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentRoomKey]);

  return (
    <div className="game-container">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    </div>
  );
};

export default Game;
