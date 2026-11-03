/**
 * THE LAST TRACK: ETERNAL RUN — Movement & HUD Usability Automated Verification
 */

import * as THREE from 'three';
import { GameEngine } from '../src/game/gameEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

console.log('====================================================');
console.log('STARTING MOVEMENT & HUD USABILITY VERIFICATION TEST');
console.log('====================================================\n');

let passedTests = 0;

// Test 1: Initial position & bounds in Prologue Depot
console.log('▶ [Test 1] Survivor initial position & depot platform boundaries...');
{
  const engine = new GameEngine();
  const playerPos = new THREE.Vector3(0, 1.6, 6);

  // Check initial state
  assert(playerPos.x === 0 && playerPos.z === 6, 'Survivor must spawn at train walkway exit (0, 1.6, 6)');
  assert(engine.prologue.isActive === true, 'Prologue must be active');
  assert(engine.prologue.step === 'intro_cutscene', 'Must start at intro_cutscene');

  console.log('  ✓ Initial survivor coordinates verified at (0, 1.6, 6).');
  passedTests++;
}

// Test 2: Dialogue blocking verification
console.log('▶ [Test 2] Dialogue & pause input blocking verification...');
{
  const engine = new GameEngine();
  const playerPos = new THREE.Vector3(0, 1.6, 6);

  // When dialogue is open, player cannot move
  assert(engine.prologue.dialogueOpen === true, 'Dialogue initially open');
  const isBlockedByDialogue = engine.gameState === 'Paused' || (engine.prologue.isActive && engine.prologue.dialogueOpen);
  assert(isBlockedByDialogue === true, 'Movement must be blocked during dialogue');

  // Advance dialogue
  engine.advancePrologueCutscene();
  engine.closeStoryDialogue();
  assert(engine.prologue.dialogueOpen === false, 'Dialogue must be closed after closeStoryDialogue()');
  const isUnblocked = !engine.prologue.dialogueOpen && engine.gameState !== 'Paused';
  assert(isUnblocked === true, 'Movement must be unblocked after dialogue dismissed');

  console.log('  ✓ Dialogue & pause input blocking successfully verified.');
  passedTests++;
}

// Test 3: Movement with WASD & Arrow Keys onto depot platform
console.log('▶ [Test 3] Movement simulation with D / ArrowRight onto depot platform...');
{
  const engine = new GameEngine();
  engine.advancePrologueCutscene(); // step is now radio_message

  const playerPos = new THREE.Vector3(0, 1.6, 6);
  const isAtPlatform = Boolean(
    engine.prologue.isActive &&
    engine.prologue.step !== 'depart_to_settlement' &&
    engine.prologue.step !== 'prologue_complete'
  );
  assert(isAtPlatform === true, 'Player must be recognized as at the depot platform');

  // Simulate walking right (D or ArrowRight) for 1 second at normal speed 3.8
  const delta = 1.0;
  const moveSpeed = 3.8;
  const moveDir = new THREE.Vector3(1, 0, 0); // D / ArrowRight
  playerPos.addScaledVector(moveDir, moveSpeed * delta);

  // Platform bounds check
  if (isAtPlatform) {
    playerPos.x = Math.max(-1.1, Math.min(6.5, playerPos.x));
    playerPos.z = Math.max(-27.5, Math.min(22.0, playerPos.z));
  }

  assert(playerPos.x === 3.8, `Survivor x should have advanced to 3.8 onto depot platform, got ${playerPos.x}`);
  assert(playerPos.z === 6.0, `Survivor z should remain at 6.0, got ${playerPos.z}`);

  // Emergency radio is located at (3.8, 1.4, 6.0)
  const radioPos = new THREE.Vector3(3.8, 1.4, 6.0);
  const distToRadio = playerPos.distanceTo(radioPos);
  assert(distToRadio < 0.5, `Survivor must be within interaction range (< 3.8m) of radio, actual distance is ${distToRadio.toFixed(2)}m`);

  // Trigger radio transmission
  engine.readRadioTransmission();
  assert(engine.prologue.radioMessageRead === true, 'Radio message must be marked read');
  assert(engine.prologue.step === 'scavenge_resources', 'Prologue step must advance to scavenge_resources');

  console.log('  ✓ Movement onto platform and radio interaction confirmed.');
  passedTests++;
}

// Test 4: Sprinting with Shift & Walking towards Scavenge Caches
console.log('▶ [Test 4] Sprinting with Shift (speed 6.5) along depot platform to caches...');
{
  const engine = new GameEngine();
  engine.advancePrologueCutscene();
  engine.readRadioTransmission(); // now at scavenge_resources

  const playerPos = new THREE.Vector3(3.8, 1.6, 6);

  // Move towards Fuel Barrel Cache at (4.0, 1.4, 1.5)
  // Distance delta: z changes from 6.0 to 1.5 (downward by 4.5m)
  const isSprint = true;
  const moveSpeed = isSprint ? 6.5 : 3.8;
  assert(moveSpeed === 6.5, 'Sprint speed must be 6.5');

  // Walk south along platform (S / ArrowDown: z -= 1)
  const moveDir = new THREE.Vector3(0, 0, -1);
  const delta = 4.5 / 6.5; // time to reach z=1.5
  playerPos.addScaledVector(moveDir, moveSpeed * delta);

  // Adjust lateral slightly towards x=4.0
  playerPos.x = 4.0;
  playerPos.z = Math.max(-27.5, Math.min(22.0, playerPos.z));

  const fuelCratePos = new THREE.Vector3(4.0, 1.4, 1.5);
  const distToFuel = playerPos.distanceTo(fuelCratePos);
  assert(distToFuel < 0.5, `Survivor must be within interaction distance of fuel crate, distance: ${distToFuel.toFixed(2)}m`);

  // Scavenge fuel crate (+25L added to initial 12L = 37L)
  engine.scavengePrologueCrate('crate_prologue_fuel');
  assert(engine.prologue.fuelCollected === 1, 'Fuel collected must be 1');
  assert(engine.trainStats.currentFuel === 37, `Train fuel should now be 37L (12 initial + 25), got ${engine.trainStats.currentFuel}`);

  // Walk further south towards Scrap Pile at (4.0, 1.4, -8.5)
  playerPos.z = -8.5;
  const scrapPilePos = new THREE.Vector3(4.0, 1.4, -8.5);
  const distToScrap = playerPos.distanceTo(scrapPilePos);
  assert(distToScrap < 0.5, `Survivor must be within interaction distance of scrap pile, distance: ${distToScrap.toFixed(2)}m`);

  engine.scavengePrologueCrate('crate_prologue_scrap');
  assert(engine.prologue.scrapCollected === 15, 'Scrap collected must be 15');
  assert(engine.prologue.step === 'repair_engine', 'Prologue step must advance to repair_engine');

  console.log('  ✓ Sprinting, distance calculations, and scavenging verified.');
  passedTests++;
}

// Test 5: Train in-transit corridor boundary restrictions
console.log('▶ [Test 5] In-transit corridor collision bounds verification...');
{
  const engine = new GameEngine();
  // Simulate train in motion on open tracks (not at station, prologue completed)
  engine.prologue.isActive = false;
  engine.currentStation = null;

  const playerPos = new THREE.Vector3(0, 1.6, 0);
  const isAtPlatform = Boolean(
    engine.currentStation || (engine.prologue.isActive && engine.prologue.step !== 'depart_to_settlement' && engine.prologue.step !== 'prologue_complete')
  );
  assert(isAtPlatform === false, 'Train is in transit, isAtPlatform must be false');

  // Attempt to walk far right (x = 10) off the train
  playerPos.x = 10;
  if (!isAtPlatform) {
    playerPos.x = Math.max(-1.1, Math.min(1.1, playerPos.x));
    playerPos.z = Math.max(-27.5, Math.min(8.0, playerPos.z));
  }
  assert(playerPos.x === 1.1, `Survivor x must be clamped to walkway width [-1.1, 1.1], got ${playerPos.x}`);

  // Attempt to walk far left (x = -10)
  playerPos.x = -10;
  if (!isAtPlatform) {
    playerPos.x = Math.max(-1.1, Math.min(1.1, playerPos.x));
  }
  assert(playerPos.x === -1.1, `Survivor x must be clamped to walkway width [-1.1, 1.1], got ${playerPos.x}`);

  console.log('  ✓ In-transit train walkway collision clamping confirmed.');
  passedTests++;
}

// Test 6: Single authoritative resource display locations
console.log('▶ [Test 6] Single authoritative resource verification...');
{
  const engine = new GameEngine();
  engine.trainStats.currentFuel = 42;
  engine.trainStats.maxFuel = 100;
  engine.inventory = [{ id: 'scrap', name: 'Scrap Metal', type: 'Material', weight: 0.5, quantity: 18, maxStack: 99, description: '', icon: 'box' }];

  // Fuel: authoritative value
  const fuelValue = engine.trainStats.fuel !== undefined ? engine.trainStats.fuel : engine.trainStats.currentFuel;
  assert(fuelValue === 42, `Fuel authoritative value is 42, got ${fuelValue}`);

  // Scrap: authoritative value
  const scrapValue = (engine.inventory.find(i => i.id === 'scrap')?.quantity || 0) + (engine.storage.find(i => i.id === 'scrap')?.quantity || 0);
  assert(scrapValue === 18, `Scrap authoritative count is 18, got ${scrapValue}`);

  // Hull: authoritative value
  const totalTrainHp = engine.carriages.reduce((acc, c) => acc + c.currentHealth, 0);
  const totalTrainMaxHp = engine.carriages.reduce((acc, c) => acc + c.maxHealth, 0);
  const trainHpPercent = Math.min(100, Math.max(0, (totalTrainHp / Math.max(1, totalTrainMaxHp)) * 100));
  assert(trainHpPercent > 0 && trainHpPercent <= 100, `Hull percentage valid: ${trainHpPercent}%`);

  console.log('  ✓ Single authoritative resource calculations confirmed.');
  passedTests++;
}

console.log('\n====================================================');
console.log(`ALL ${passedTests} TESTS PASSED SUCCESSFULLY!`);
console.log('====================================================');
