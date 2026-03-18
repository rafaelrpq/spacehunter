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
      right: 'dungeon_entry',
      bottom: 'volcano_biome'
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
      left: 'overworld',
      right: 'dungeon_boss'
    },
    powerups: [
      { x: 400, y: 100, type: 'speed', color: '#ffff00', collected: false }
    ]
  },
  dungeon_boss: {
    color: '#000',
    obstacles: [
      { x: 0, y: 0, width: 800, height: 40, color: '#330033' },
      { x: 0, y: 560, width: 800, height: 40, color: '#330033' },
      { x: 0, y: 0, width: 20, height: 600, color: '#330033' }, // Reduzi de 40 para 20 para evitar prender o player
      { x: 760, y: 0, width: 40, height: 600, color: '#330033' },
    ],
    enemies: [
      { 
        x: 400, y: 150, width: 80, height: 80, color: '#8800ff', 
        health: 40, maxHealth: 40, vx: 2, vy: 2, isBoss: true, name: 'VOID SENTINEL',
        shootTimer: 0
      },
    ],
    exits: {
      left: 'dungeon_entry'
    },
    powerups: []
  },
  volcano_biome: {
    color: '#300',
    obstacles: [
      { x: 100, y: 100, width: 600, height: 400, color: '#ff4400', isLava: true }, // Lava Hazard
      { x: 350, y: 250, width: 100, height: 100, color: '#633' }, // Safe platform
    ],
    enemies: [
      { x: 100, y: 100, width: 40, health: 4, maxHealth: 4, color: '#f80', vx: 3, vy: 0 },
      { x: 600, y: 400, width: 40, health: 4, maxHealth: 4, color: '#f80', vx: -3, vy: 0 },
    ],
    exits: {
      top: 'overworld'
    },
    powerups: [
      { x: 400, y: 300, type: 'missiles', color: '#f00', collected: false }
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
    z: 0, 
    vz: 0,
    width: 32,
    height: 32,
    speed: 4,
    color: '#00ffcc',
    isJumping: false,
    jumpCount: 0,
    maxJumps: 1,
    health: 5,
    maxHealth: 5,
    missiles: 0,
    hasMissiles: false,
    invulnerable: 0,
    direction: { x: 0, y: 1 },
  });

  const [currentRoomKey, setCurrentRoomKey] = React.useState<keyof typeof ROOMS>('overworld');
  const projectilesRef = useRef<any[]>([]);
  const enemiesRef = useRef<any[]>([]);
  const obstaclesRef = useRef<any[]>([]);
  const powerupsRef = useRef<any[]>([]);

  useEffect(() => {
    const room = ROOMS[currentRoomKey];
    obstaclesRef.current = [...room.obstacles];
    enemiesRef.current = room.enemies.map(e => ({ ...e }));
    powerupsRef.current = (room as any).powerups.map((p: any) => ({ ...p }));
    projectilesRef.current = [];
  }, [currentRoomKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space') {
        if (playerRef.current.jumpCount < playerRef.current.maxJumps) {
          playerRef.current.vz = 8;
          playerRef.current.isJumping = true;
          playerRef.current.jumpCount++;
        }
      }
      if (e.code === 'KeyZ' || e.code === 'Enter') {
        shoot(false);
      }
      if (e.code === 'KeyX' && playerRef.current.hasMissiles && playerRef.current.missiles > 0) {
        shoot(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const shoot = (isMissile: boolean) => {
    const player = playerRef.current;
    if (isMissile) player.missiles--;

    let dx = 0, dy = 0;
    if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) dy -= 1;
    if (keysRef.current['ArrowDown'] || keysRef.current['KeyS']) dy += 1;
    if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) dx -= 1;
    if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) dx += 1;
    if (dx === 0 && dy === 0) { dx = player.direction.x; dy = player.direction.y; }
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) { dx /= mag; dy /= mag; }
    
    projectilesRef.current.push({
      x: player.x, y: player.y - player.z,
      vx: dx * (isMissile ? 10 : 7), 
      vy: dy * (isMissile ? 10 : 7),
      radius: isMissile ? 8 : 4, 
      color: isMissile ? '#f00' : '#ff0055', 
      life: 100, 
      isEnemy: false,
      isMissile: isMissile
    });
  };

  const checkCollision = (x: number, y: number, w: number, h: number, ignoreLava: boolean = false) => {
    for (const obs of obstaclesRef.current) {
      if (obs.isLava && ignoreLava) continue;
      if (x + w/2 > obs.x && x - w/2 < obs.x + obs.width &&
          y + h/2 > obs.y && y - h/2 < obs.y + obs.height) return obs;
    }
    return null;
  };

  const update = () => {
    const player = playerRef.current;
    const keys = keysRef.current;
    const room = ROOMS[currentRoomKey];

    if (player.invulnerable > 0) player.invulnerable--;

    // Movement
    let dx = 0, dy = 0;
    if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const mag = Math.sqrt(dx * dx + dy * dy);
      const moveX = (dx / mag) * player.speed;
      const moveY = (dy / mag) * player.speed;
      
      const collX = checkCollision(player.x + moveX, player.y, player.width, player.height, true);
      if (!collX) player.x += moveX;
      
      const collY = checkCollision(player.x, player.y + moveY, player.width, player.height, true);
      if (!collY) player.y += moveY;
      
      player.direction = { x: dx / mag, y: dy / mag };
    }

    // Lava Hazard
    const lavaCollision = checkCollision(player.x, player.y, player.width, player.height);
    if (lavaCollision?.isLava && player.z < 5 && player.invulnerable <= 0) {
      player.health--;
      player.invulnerable = 60;
    }

    // Jump
    if (player.isJumping) {
      player.z += player.vz;
      player.vz -= 0.5;
      if (player.z <= 0) { player.z = 0; player.vz = 0; player.isJumping = false; player.jumpCount = 0; }
    }

    // Transitions
    if (player.x > CANVAS_WIDTH && (room.exits as any).right) { setCurrentRoomKey((room.exits as any).right); player.x = 40; } // Spawn a bit more inside
    else if (player.x < 0 && (room.exits as any).left) { setCurrentRoomKey((room.exits as any).left); player.x = CANVAS_WIDTH - 40; }
    else if (player.y > CANVAS_HEIGHT && (room.exits as any).bottom) { setCurrentRoomKey((room.exits as any).bottom); player.y = 40; player.x = CANVAS_WIDTH/2; }
    else if (player.y < 0 && (room.exits as any).top) { setCurrentRoomKey((room.exits as any).top); player.y = CANVAS_HEIGHT - 40; player.x = CANVAS_WIDTH/2; }
    else { player.x = Math.max(0, Math.min(CANVAS_WIDTH, player.x)); player.y = Math.max(0, Math.min(CANVAS_HEIGHT, player.y)); }

    // Death check
    if (player.health <= 0) { player.health = player.maxHealth; player.x = CANVAS_WIDTH/2; player.y = CANVAS_HEIGHT/2; setCurrentRoomKey('overworld'); }

    // Enemies
    enemiesRef.current.forEach(enemy => {
      if (enemy.isBoss) {
        enemy.shootTimer++;
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.vx = Math.cos(angle) * (enemy.health < 20 ? 3 : 1.5);
        enemy.vy = Math.sin(angle) * (enemy.health < 20 ? 3 : 1.5);
        if (enemy.shootTimer > (enemy.health < 20 ? 30 : 60)) {
          enemy.shootTimer = 0;
          if (enemy.health < 20) {
            for (let i = 0; i < 12; i++) {
              const a = (Math.PI * 2 / 12) * i;
              projectilesRef.current.push({ x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, vx: Math.cos(a)*5, vy: Math.sin(a)*5, radius: 6, color: '#f0f', life: 120, isEnemy: true });
            }
          } else {
            for (let i = -1; i <= 1; i++) {
              const a = angle + (i * 0.3);
              projectilesRef.current.push({ x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, vx: Math.cos(a)*4, vy: Math.sin(a)*4, radius: 6, color: '#f0f', life: 120, isEnemy: true });
            }
          }
        }
      }
      const eColl = checkCollision(enemy.x + enemy.vx, enemy.y + enemy.vy, enemy.width, enemy.height, true);
      if (eColl || enemy.x + enemy.vx < 0 || enemy.x + enemy.vx > CANVAS_WIDTH - enemy.width) enemy.vx *= -1;
      if (eColl || enemy.y + enemy.vy < 0 || enemy.y + enemy.vy > CANVAS_HEIGHT - enemy.height) enemy.vy *= -1;
      enemy.x += enemy.vx; enemy.y += enemy.vy;
    });

    // Projectiles
    projectilesRef.current = projectilesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.isEnemy) {
        const dist = Math.sqrt((p.x - player.x)**2 + (p.y - player.y)**2);
        if (dist < 20 && player.z < 10 && player.invulnerable <= 0) {
           player.health--; player.invulnerable = 60;
           return false;
        }
      } else {
        for (const enemy of enemiesRef.current) {
          if (p.x > enemy.x && p.x < enemy.x + enemy.width && p.y > enemy.y && p.y < enemy.y + enemy.height) {
            enemy.health -= p.isMissile ? 5 : 1;
            if (enemy.health <= 0 && enemy.isBoss) {
               powerupsRef.current.push({ x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, type: 'double_jump', color: '#0ff', collected: false });
            }
            return false;
          }
        }
      }
      if (checkCollision(p.x, p.y, p.radius, p.radius, true)) return false;
      return p.life > 0 && p.x > 0 && p.x < CANVAS_WIDTH && p.y > 0 && p.y < CANVAS_HEIGHT;
    });

    enemiesRef.current = enemiesRef.current.filter(e => e.health > 0);
    powerupsRef.current.forEach(p => {
      if (!p.collected) {
        const dist = Math.sqrt((player.x - p.x)**2 + (player.y - p.y)**2);
        if (dist < 30) { 
          p.collected = true; 
          if (p.type === 'speed') player.speed = 7; 
          if (p.type === 'double_jump') player.maxJumps = 2; 
          if (p.type === 'missiles') { player.hasMissiles = true; player.missiles += 10; }
        }
      }
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const room = ROOMS[currentRoomKey];
    const player = playerRef.current;
    ctx.fillStyle = room.color; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke(); }
    for (let y = 0; y < CANVAS_HEIGHT; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke(); }

    obstaclesRef.current.forEach(obs => { ctx.fillStyle = obs.color; ctx.fillRect(obs.x, obs.y, obs.width, obs.height); });
    enemiesRef.current.forEach(enemy => {
      ctx.fillStyle = enemy.color; ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      ctx.fillStyle = '#f00'; ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 4);
      ctx.fillStyle = '#0f0'; ctx.fillRect(enemy.x, enemy.y - 10, (enemy.health / (enemy.maxHealth || 3)) * enemy.width, 4);
    });
    powerupsRef.current.forEach(p => { if (!p.collected) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill(); } });
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(player.x, player.y, 16, 8, 0, 0, Math.PI*2); ctx.fill();
    if (player.invulnerable % 10 < 5) { ctx.fillStyle = player.color; ctx.fillRect(player.x - 16, player.y - 16 - player.z, 32, 32); }
    
    projectilesRef.current.forEach(p => { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); });
    
    // UI
    ctx.fillStyle = '#fff'; ctx.font = '16px monospace';
    ctx.fillText(`Corações: ${"❤️".repeat(player.health)}`, 20, 30);
    ctx.fillText(`Mísseis (X): ${player.hasMissiles ? player.missiles : '??'}`, 20, 55);
    let uiY = 80;
    if (player.speed > 4) { ctx.fillText('POWER-UP: VELOCIDADE!', 20, uiY); uiY += 25; }
    if (player.maxJumps > 1) { ctx.fillText('POWER-UP: PULO DUPLO!', 20, uiY); uiY += 25; }
    ctx.fillText('Z: Atirar | X: Míssil | Espaço: Pulo', 20, CANVAS_HEIGHT - 20);

    enemiesRef.current.forEach(enemy => {
      if (enemy.isBoss) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(CANVAS_WIDTH/2 - 200, CANVAS_HEIGHT - 60, 400, 30);
        ctx.fillStyle = '#f00'; ctx.fillRect(CANVAS_WIDTH/2 - 195, CANVAS_HEIGHT - 55, (enemy.health / enemy.maxHealth) * 390, 20);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(enemy.name, CANVAS_WIDTH/2, CANVAS_HEIGHT - 70); ctx.textAlign = 'left';
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animationFrameId: number;
    const render = () => { update(); draw(ctx); animationFrameId = requestAnimationFrame(render); };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentRoomKey]);

  return (<div className="game-container"><canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} /></div>);
};

export default Game;
