// Testes headless da fisica dos carros (Rapier 0.19 em Node + o MESMO codigo de src/game/vehicles/sim/vehiclePhysics.ts).
// Uso: node tools/vehicle-tests/run.mjs [--only=nome] [--legacy]   (Node 22.6+ com remocao de tipos)
import '../casino-tests/register.mjs'
await import('./vehicle.test.ts')
