/**
 * Modificadores do mundo ativo lidos por sistemas compartilhados (um objeto mutavel, lido por quadro, sem re-render).
 * `speedMul`: multiplica a velocidade desejada da jogadora (agua rasa, areia fofa...). O PlayerController le daqui.
 */
export const worldMods = {
  speedMul: 1,
  /** 0..1 quanto do corpo esta na agua (para efeitos) */
  wet: 0,
}
