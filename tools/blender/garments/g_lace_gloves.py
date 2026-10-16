"""Luvas curtas de renda (ate o pulso) com babadinho."""
import numpy as np
import g_gloves
from gx import meta_of


def build(body):
    g_gloves.S_CUT = 1.80
    G, _, _ = g_gloves.build(body)
    G.id = "lace_gloves"
    mats = {"base": ("#f4efe6", "lace"), "trim": ("#ffffff", "lace")}
    meta = meta_of("lace_gloves", "Luvas curtas de renda", "gloves", ["base", "trim"], {"base": "#f4efe6", "trim": "#ffffff"}, {"base": "lace", "trim": "lace"},
                   {"base": ["lace", "satin", "latex", "matte", "glitter"], "trim": ["lace", "satin", "tulle", "pearl"]}, ["hands", "wrists"],
                   tags=dict(styles=["romantico", "gala", "goth"], colors=["branco"], formality=0.7, rarity="raro"))
    return G, mats, meta
