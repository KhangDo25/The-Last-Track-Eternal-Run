export interface UnityScriptDoc {
  id: string;
  category: string;
  title: string;
  filePath: string;
  goal: string;
  code: string;
  unitySetup: string[];
  inspectorConfig: Record<string, string | number>;
  testSteps: string[];
  acceptanceCriteria: string[];
}

export const UNITY_CODEBASE: UnityScriptDoc[] = [
  {
    id: 'train_controller',
    category: 'Train',
    title: 'Train Controller & Physics',
    filePath: 'Assets/Scripts/Train/TrainController.cs',
    goal: 'Responsible for throttle input, current speed, acceleration calculation, braking, and emergency stop states.',
    code: `using UnityEngine;

namespace LastTrack.Train
{
    public enum TrainThrottle
    {
        Stop = 0,
        Quarter = 25,
        Half = 50,
        ThreeQuarter = 75,
        Full = 100,
        Overdrive = 120
    }

    public enum TrainState
    {
        Moving,
        Braking,
        Stationary,
        Departing,
        EmergencyStop,
        Disabled
    }

    [RequireComponent(typeof(TrainMovement))]
    [RequireComponent(typeof(TrainFuelSystem))]
    [RequireComponent(typeof(TrainWeightSystem))]
    public class TrainController : MonoBehaviour
    {
        [Header("Engine Specifications")]
        [SerializeField] private float baseEnginePower = 120f;
        [SerializeField] private float maxSpeed = 100f;
        [SerializeField] private float brakePower = 15f;
        [SerializeField] private float emergencyBrakePower = 40f;

        [Header("Current State")]
        [SerializeField] private TrainThrottle currentThrottle = TrainThrottle.Stop;
        [SerializeField] private TrainState currentState = TrainState.Stationary;
        [SerializeField] private float currentSpeed = 0f;

        private TrainMovement movement;
        private TrainFuelSystem fuelSystem;
        private TrainWeightSystem weightSystem;

        public float CurrentSpeed => currentSpeed;
        public float MaxSpeed => maxSpeed;
        public TrainThrottle Throttle => currentThrottle;
        public TrainState State => currentState;

        private void Awake()
        {
            movement = GetComponent<TrainMovement>();
            fuelSystem = GetComponent<TrainFuelSystem>();
            weightSystem = GetComponent<TrainWeightSystem>();
        }

        private void Update()
        {
            HandleThrottleAndSpeed(Time.deltaTime);
        }

        public void SetThrottle(TrainThrottle throttle)
        {
            currentThrottle = throttle;
            if (currentState == TrainState.EmergencyStop && throttle != TrainThrottle.Stop)
            {
                currentState = TrainState.Moving;
            }
        }

        public void TriggerEmergencyBrake()
        {
            currentThrottle = TrainThrottle.Stop;
            currentState = TrainState.EmergencyStop;
        }

        private void HandleThrottleAndSpeed(float dt)
        {
            if (fuelSystem.CurrentFuel <= 0)
            {
                currentState = TrainState.Disabled;
            }

            float targetSpeed = 0f;
            if (currentState != TrainState.EmergencyStop && currentState != TrainState.Disabled)
            {
                float throttleRatio = (float)currentThrottle / 100f;
                targetSpeed = maxSpeed * throttleRatio;
            }

            float totalWeight = Mathf.Max(10f, weightSystem.TotalWeight);
            float acceleration = (baseEnginePower / totalWeight) * 2.5f;

            if (currentSpeed < targetSpeed)
            {
                currentSpeed = Mathf.MoveTowards(currentSpeed, targetSpeed, acceleration * dt);
                if (currentSpeed > 0.1f) currentState = TrainState.Moving;
            }
            else if (currentSpeed > targetSpeed)
            {
                float effectiveBrake = (currentState == TrainState.EmergencyStop) ? emergencyBrakePower : brakePower;
                currentSpeed = Mathf.MoveTowards(currentSpeed, targetSpeed, effectiveBrake * dt);
                if (currentSpeed < 0.1f && targetSpeed == 0f) currentState = TrainState.Stationary;
            }

            movement.ApplyVelocity(currentSpeed);
            fuelSystem.ConsumeFuel(currentSpeed, totalWeight, dt);
        }
    }
}`,
    unitySetup: [
      'Create empty GameObject named "TrainRoot" at scene root (0,0,0)',
      'Attach TrainController, TrainMovement, TrainFuelSystem, TrainWeightSystem',
      'Assign child Locomotive cabin and bogies underneath TrainRoot',
      'Set Layer to "Train" and Tag to "Train"',
    ],
    inspectorConfig: {
      'Base Engine Power': 120,
      'Max Speed': 100,
      'Brake Power': 15,
      'Emergency Brake Power': 40,
    },
    testSteps: [
      'Enter Play Mode in Test_Train scene',
      'Call SetThrottle(TrainThrottle.Half)',
      'Verify CurrentSpeed smoothly increases towards 50 km/h based on weight',
      'Call TriggerEmergencyBrake() and verify rapid deceleration',
    ],
    acceptanceCriteria: [
      'Train accelerates proportionally to (EnginePower / TotalWeight)',
      'Train consumes fuel during movement',
      'Train stops completely when brake is applied or fuel is depleted',
      'Emergency brake locks wheels and sounds siren',
    ],
  },
  {
    id: 'train_fuel',
    category: 'Train',
    title: 'Train Fuel System',
    filePath: 'Assets/Scripts/Train/TrainFuelSystem.cs',
    goal: 'Calculates dynamic fuel consumption based on speed, train weight, and active biome multiplier.',
    code: `using UnityEngine;

namespace LastTrack.Train
{
    public class TrainFuelSystem : MonoBehaviour
    {
        [Header("Fuel Storage")]
        [SerializeField] private float maxFuel = 100f;
        [SerializeField] private float currentFuel = 100f;
        [SerializeField] private float baseConsumptionRate = 0.05f; // per second

        public float CurrentFuel => currentFuel;
        public float MaxFuel => maxFuel;
        public float FuelPercentage => (currentFuel / maxFuel) * 100f;

        public void ConsumeFuel(float speedKmH, float trainWeightTons, float dt)
        {
            if (currentFuel <= 0f || speedKmH <= 0.1f) return;

            float speedMultiplier = speedKmH / 50f;
            float weightMultiplier = trainWeightTons / 40f;
            float biomeMultiplier = 1.0f; // e.g. AbsoluteZero increases to 1.5f

            float consumed = baseConsumptionRate * speedMultiplier * weightMultiplier * biomeMultiplier * dt;
            currentFuel = Mathf.Max(0f, currentFuel - consumed);
        }

        public void AddFuel(float amount)
        {
            currentFuel = Mathf.Min(maxFuel, currentFuel + amount);
        }
    }
}`,
    unitySetup: [
      'Component automatically required on TrainRoot by TrainController',
      'Hook up UI slider in HUD to display FuelPercentage',
    ],
    inspectorConfig: {
      'Max Fuel': 100,
      'Current Fuel': 100,
      'Base Consumption Rate': 0.05,
    },
    testSteps: [
      'Set train speed to 80 km/h and weight to 60 tons',
      'Observe currentFuel decreasing in Inspector',
      'Call AddFuel(25) and verify instant tank refill',
    ],
    acceptanceCriteria: [
      'Heavier train weight strictly accelerates fuel drain',
      'Zero fuel halts train locomotive acceleration',
    ],
  },
  {
    id: 'turret_controller',
    category: 'Combat',
    title: 'Turret Controller & Dual Targeting',
    filePath: 'Assets/Scripts/Combat/TurretController.cs',
    goal: 'Implements dual autonomous targeting and player manual control for train-mounted Gatling turrets.',
    code: `using UnityEngine;
using LastTrack.Data;

namespace LastTrack.Combat
{
    public class TurretController : MonoBehaviour
    {
        [Header("Turret Data")]
        [SerializeField] private TurretData turretData;

        [Header("Transforms")]
        [SerializeField] private Transform yawTransform;
        [SerializeField] private Transform pitchTransform;
        [SerializeField] private Transform[] muzzlePoints;

        [Header("Runtime State")]
        [SerializeField] private float currentAmmo = 250f;
        [SerializeField] private float currentHeat = 0f;
        [SerializeField] private bool isOverheated = false;
        [SerializeField] private bool isManualControl = false;

        private Transform currentTarget;
        private float fireTimer = 0f;

        public bool IsOverheated => isOverheated;
        public float Heat => currentHeat;
        public float Ammo => currentAmmo;

        private void Update()
        {
            HandleCooldown(Time.deltaTime);

            if (isManualControl)
            {
                // Managed by player input (Mouse Aim)
            }
            else
            {
                AutoScanAndEngage(Time.deltaTime);
            }
        }

        private void HandleCooldown(float dt)
        {
            if (currentHeat > 0f)
            {
                currentHeat = Mathf.Max(0f, currentHeat - turretData.coolingRate * dt);
                if (currentHeat < 20f) isOverheated = false;
            }
        }

        private void AutoScanAndEngage(float dt)
        {
            if (isOverheated || currentAmmo <= 0) return;

            // Target Detection
            Collider[] colliders = Physics.OverlapSphere(transform.position, turretData.range, LayerMask.GetMask("Enemy"));
            if (colliders.Length > 0)
            {
                currentTarget = colliders[0].transform;
                Vector3 targetDir = (currentTarget.position - yawTransform.position).normalized;
                Quaternion lookRot = Quaternion.LookRotation(targetDir);
                yawTransform.rotation = Quaternion.Slerp(yawTransform.rotation, Quaternion.Euler(0, lookRot.eulerAngles.y, 0), 8f * dt);

                fireTimer += dt;
                if (fireTimer >= (1f / turretData.fireRate))
                {
                    fireTimer = 0f;
                    FireWeapon();
                }
            }
        }

        public void ManualFire()
        {
            if (isOverheated || currentAmmo <= 0) return;
            FireWeapon();
        }

        private void FireWeapon()
        {
            currentAmmo--;
            currentHeat = Mathf.Min(100f, currentHeat + turretData.heatPerShot);
            if (currentHeat >= 100f) isOverheated = true;

            // Spawn projectile or raycast damage
            if (currentTarget != null)
            {
                var damageable = currentTarget.GetComponent<IDamageable>();
                damageable?.TakeDamage(turretData.damage);
            }
        }

        public void SetManualControl(bool manual)
        {
            isManualControl = manual;
        }
    }
}`,
    unitySetup: [
      'Create DefenseCarriage prefab with a TurretMount slot',
      'Instantiate GatlingTurret prefab onto the slot',
      'Assign YawTransform (rotating base) and PitchTransform (gun barrel holder)',
      'Create and assign TurretData ScriptableObject to the turretData slot',
    ],
    inspectorConfig: {
      'Current Ammo': 250,
      'Current Heat': 0,
      'Is Overheated': 'false',
    },
    testSteps: [
      'Spawn an Enemy on Layer "Enemy" within 40m range',
      'Verify turret automatically tracks target and fires',
      'Interact with Turret to enter Manual Control mode',
      'Press Left Mouse Button to fire manually and observe heat gauge',
    ],
    acceptanceCriteria: [
      'Turret automatically prioritizes enemies threatening carriages',
      'Overheating locks firing until temperature drops below 20%',
      'Manual and automated modes share unified ammunition and damage calculations',
    ],
  },
  {
    id: 'chaser_ai',
    category: 'Enemies',
    title: 'Chaser Enemy AI',
    filePath: 'Assets/Scripts/Enemies/ChaserAI.cs',
    goal: 'Implements Chaser behavior: chase train, approach carriage, attach, claw hull to create breach.',
    code: `using UnityEngine;
using LastTrack.Combat;

namespace LastTrack.Enemies
{
    public class ChaserAI : MonoBehaviour, IDamageable
    {
        [Header("Stats")]
        [SerializeField] private float maxHealth = 40f;
        [SerializeField] private float currentHealth = 40f;
        [SerializeField] private float runSpeed = 22f;
        [SerializeField] private float attackDamage = 10f;
        [SerializeField] private float attackInterval = 2.0f;

        [Header("Targeting")]
        [SerializeField] private Transform targetCarriage;
        private bool isAttached = false;
        private float attackTimer = 0f;

        public void TakeDamage(float damage)
        {
            currentHealth -= damage;
            if (currentHealth <= 0f)
            {
                Die();
            }
        }

        private void Update()
        {
            if (targetCarriage == null) return;

            if (!isAttached)
            {
                float step = runSpeed * Time.deltaTime;
                transform.position = Vector3.MoveTowards(transform.position, targetCarriage.position, step);
                transform.LookAt(targetCarriage.position);

                if (Vector3.Distance(transform.position, targetCarriage.position) < 2.5f)
                {
                    isAttached = true;
                    transform.SetParent(targetCarriage);
                }
            }
            else
            {
                attackTimer += Time.deltaTime;
                if (attackTimer >= attackInterval)
                {
                    attackTimer = 0f;
                    var damageable = targetCarriage.GetComponent<IDamageable>();
                    damageable?.TakeDamage(attackDamage);
                }
            }
        }

        private void Die()
        {
            // Spawn death particles & drop scrap loot
            Destroy(gameObject);
        }
    }
}`,
    unitySetup: [
      'Create Chaser prefab with CapsuleCollider and Rigidbody (isKinematic = true)',
      'Assign Layer "Enemy" and Tag "Enemy"',
      'Attach ChaserAI component and assign audio effects',
    ],
    inspectorConfig: {
      'Max Health': 40,
      'Run Speed': 22,
      'Attack Damage': 10,
      'Attack Interval': 2.0,
    },
    testSteps: [
      'Press F4 in development build to spawn Chaser',
      'Observe Chaser sprinting along tracks towards Defense carriage',
      'Observe Chaser attaching to hull and inflicting damage every 2 seconds',
      'Shoot with Gatling Turret and verify health depletion and destruction',
    ],
    acceptanceCriteria: [
      'Chaser maintains pace with moving train up to maximum run speed',
      'Inflicts periodic structural damage once attached',
      'Taking lethal damage cleans up GameObject and stops carriage damage',
    ],
  },
  {
    id: 'station_timer',
    category: 'Stations',
    title: 'Station Controller & Countdown Timer',
    filePath: 'Assets/Scripts/Stations/StationTimer.cs',
    goal: 'Controls station stop duration, warning horns at 120s and 30s, and automated departure.',
    code: `using UnityEngine;
using System;
using LastTrack.Train;

namespace LastTrack.Stations
{
    public class StationTimer : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private float durationSeconds = 180f; // 3 min per spec
        [SerializeField] private TrainController trainController;

        private float remainingTime;
        private bool isTimerActive = false;
        private bool warned120 = false;
        private bool warned30 = false;

        public event Action<float> OnTimerTick;
        public event Action OnDeparted;

        public float RemainingTime => remainingTime;

        public void StartStationCountdown(float duration)
        {
            durationSeconds = duration;
            remainingTime = duration;
            isTimerActive = true;
            warned120 = false;
            warned30 = false;
        }

        private void Update()
        {
            if (!isTimerActive) return;

            remainingTime -= Time.deltaTime;
            OnTimerTick?.Invoke(remainingTime);

            // Warning 1: 120s -> 1 Horn
            if (remainingTime <= 120f && !warned120)
            {
                warned120 = true;
                // Play 1 Horn Sound
            }

            // Warning 2: 30s -> 3 Horns
            if (remainingTime <= 30f && !warned30)
            {
                warned30 = true;
                // Play 3 Horn Sounds
            }

            // 0s -> Train Departure
            if (remainingTime <= 0f)
            {
                isTimerActive = false;
                trainController.SetThrottle(TrainThrottle.Half);
                OnDeparted?.Invoke();
            }
        }
    }
}`,
    unitySetup: [
      'Create StationRoot prefab with Platform, Shelter, and LootContainers',
      'Attach StationTimer component to StationRoot',
      'Hook up Departure horn audio clip',
    ],
    inspectorConfig: {
      'Duration Seconds': 180,
    },
    testSteps: [
      'Trigger station arrival',
      'Verify remaining countdown time updates UI every frame',
      'Verify horn triggers at 120s and 30s',
      'Verify train throttles up and departs at 0s',
    ],
    acceptanceCriteria: [
      'Exact timings strictly match Section 31 specification',
      'Departure sequence closes carriage doors and initiates acceleration',
    ],
  },
  {
    id: 'player_stats',
    category: 'Player',
    title: 'Player Survival Stats System',
    filePath: 'Assets/Scripts/Player/PlayerStats.cs',
    goal: 'Tracks Health, Stamina, Hunger (-1/15s), Thirst (-1/10s), BodyTemp (37°C), Toxicity, and Sanity.',
    code: `using UnityEngine;

namespace LastTrack.Player
{
    public class PlayerStats : MonoBehaviour
    {
        [Header("Survival Meters")]
        [SerializeField] private float health = 100f;
        [SerializeField] private float stamina = 100f;
        [SerializeField] private float hunger = 100f;
        [SerializeField] private float thirst = 100f;
        [SerializeField] private float bodyTemperature = 37.0f;
        [SerializeField] private float toxicity = 0f;
        [SerializeField] private float sanity = 100f;

        private float hungerTimer = 0f;
        private float thirstTimer = 0f;

        public float Health => health;
        public float Stamina => stamina;
        public float Hunger => hunger;
        public float Thirst => thirst;
        public float BodyTemperature => bodyTemperature;
        public float Toxicity => toxicity;
        public float Sanity => sanity;

        private void Update()
        {
            float dt = Time.deltaTime;

            // Hunger: -1 / 15 sec (Spec Section 45)
            hungerTimer += dt;
            if (hungerTimer >= 15f)
            {
                hungerTimer = 0f;
                hunger = Mathf.Max(0f, hunger - 1f);
            }

            // Thirst: -1 / 10 sec (Spec Section 46)
            thirstTimer += dt;
            if (thirstTimer >= 10f)
            {
                thirstTimer = 0f;
                thirst = Mathf.Max(0f, thirst - 1f);
            }

            // Health penalty when starving or dehydrated
            if (hunger <= 0f || thirst <= 0f)
            {
                health = Mathf.Max(0f, health - 0.5f * dt);
            }
        }

        public void ConsumeFood(float amount) => hunger = Mathf.Min(100f, hunger + amount);
        public void ConsumeWater(float amount) => thirst = Mathf.Min(100f, thirst + amount);
        public void ApplyHeal(float amount) => health = Mathf.Min(100f, health + amount);
    }
}`,
    unitySetup: [
      'Attach PlayerStats component to PlayerRoot GameObject',
      'Link properties to HUD display bars',
    ],
    inspectorConfig: {
      Health: 100,
      Stamina: 100,
      Hunger: 100,
      Thirst: 100,
      'Body Temperature': 37.0,
      Toxicity: 0,
      Sanity: 100,
    },
    testSteps: [
      'Run game for 30 seconds',
      'Verify hunger dropped by 2 and thirst dropped by 3 points',
      'Consume ration to verify recovery',
    ],
    acceptanceCriteria: [
      'Drain rates accurately replicate Section 45-48 values',
      'Starvation reduces HP and causes game over at 0 HP',
    ],
  },
];
