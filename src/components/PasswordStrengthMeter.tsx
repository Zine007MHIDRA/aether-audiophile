"use client";

import React from "react";
import { calculatePasswordStrength } from "@/lib/security";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = calculatePasswordStrength(password);

  const getBarColor = (index: number) => {
    if (index >= strength.score) return "bg-white/10";
    switch (strength.score) {
      case 1:
        return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
      case 2:
        return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
      case 3:
        return "bg-aether-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]";
      case 4:
        return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]";
      default:
        return "bg-white/10";
    }
  };

  const getLabelColor = () => {
    switch (strength.score) {
      case 1:
        return "text-rose-400";
      case 2:
        return "text-amber-400";
      case 3:
        return "text-aether-gold";
      case 4:
        return "text-emerald-400 font-semibold";
      default:
        return "text-aether-muted";
    }
  };

  return (
    <div className="flex flex-col gap-2 pt-1 animate-fadeIn select-none">
      {/* 4 Segmented Strength Bars */}
      <div className="flex items-center justify-between gap-1.5">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${getBarColor(
              idx
            )}`}
          />
        ))}
      </div>

      {/* Label & Details */}
      <div className="flex items-center justify-between text-[11px] font-mono px-0.5">
        <span className="text-aether-muted text-[10px] uppercase tracking-wider">
          Security Entropy
        </span>
        <span className={`flex items-center gap-1 ${getLabelColor()}`}>
          {strength.score === 4 && <Sparkles className="w-3 h-3 text-emerald-400" />}
          {strength.label}
        </span>
      </div>

      {/* Requirement tags */}
      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-mono text-aether-muted">
        <span
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition ${
            strength.hasLength8
              ? "border-emerald-500/30 text-emerald-300 bg-emerald-950/20"
              : "border-white/5 bg-white/[0.02]"
          }`}
        >
          {strength.hasLength8 && <Check className="w-2.5 h-2.5" />} 8+ chars
        </span>
        <span
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition ${
            strength.hasUpper && strength.hasLower
              ? "border-emerald-500/30 text-emerald-300 bg-emerald-950/20"
              : "border-white/5 bg-white/[0.02]"
          }`}
        >
          {strength.hasUpper && strength.hasLower && <Check className="w-2.5 h-2.5" />} Mixed case
        </span>
        <span
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition ${
            strength.hasNumber
              ? "border-emerald-500/30 text-emerald-300 bg-emerald-950/20"
              : "border-white/5 bg-white/[0.02]"
          }`}
        >
          {strength.hasNumber && <Check className="w-2.5 h-2.5" />} Number
        </span>
        <span
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 transition ${
            strength.hasSpecial
              ? "border-emerald-500/30 text-emerald-300 bg-emerald-950/20"
              : "border-white/5 bg-white/[0.02]"
          }`}
        >
          {strength.hasSpecial && <Check className="w-2.5 h-2.5" />} Symbol
        </span>
      </div>
    </div>
  );
}
