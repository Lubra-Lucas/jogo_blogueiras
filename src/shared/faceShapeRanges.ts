// GERADO por tools/blender/facemorph/check_face_morphs.py: faixa SEGURA (peso maximo 0..1) de cada morph de formato, medida sem triangulos invertidos,
// sem auto-interseccao e sem estirar demais as regioes do olho e da boca. Nao edite a mao; rode o script de novo.
export const SHAPE_SAFE_MAX: Record<'female' | 'male', Record<string, number>> = {
  female: { f_chinPointed: 0.85, f_earsBig: 0.55, f_fun_bigEyesArea: 0.85, f_fun_elfEars: 0.55, f_noseNarrow: 0.7 },
  male: { f_fun_elfEars: 0.85 },
}
