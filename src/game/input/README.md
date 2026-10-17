# input: teclado, toque e gamepad convertidos em uma intencao (Intent).

## Toque (celular)
- `ui/Joystick.tsx`: joystick fixo (canto inferior esquerdo) ou dinamico (metade esquerda); reserva o ponteiro com `claimPointer`.
- `CameraInput.tsx`: um dedo fora do joystick gira a camera (apos 6 px; abaixo disso e toque no chao), pinca = zoom. A
  sensibilidade vem de `ui/uiPrefs.ts` (`camSens`, Ajustes > Interface).
- `setRunLatch` (botao "Correr" do dock): trava a corrida alem do joystick no limite.
