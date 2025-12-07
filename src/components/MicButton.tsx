"use client";

import { useSpeechToText } from "@/lib/use-speech-to-text";
import { useEffect, useRef } from "react";

interface MicButtonProps {
  onTranscript: (text: string) => void;
  currentValue: string;
  disabled?: boolean;
}

export function MicButton({ onTranscript, currentValue, disabled }: MicButtonProps) {
  // Store the base text (what was in the field before we started listening)
  const baseTextRef = useRef("");
  
  const { isListening, isSupported, transcript, error, toggleListening, clearError } = useSpeechToText();

  // When we start listening, capture the current value as base
  useEffect(() => {
    if (isListening) {
      baseTextRef.current = currentValue;
    }
  }, [isListening, currentValue]);

  // Update the textarea with base + transcript as user speaks
  useEffect(() => {
    if (isListening && transcript) {
      const separator = baseTextRef.current.trim() ? " " : "";
      onTranscript(baseTextRef.current + separator + transcript);
    }
  }, [transcript, isListening, onTranscript]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {error && (
        <p className="text-red-400 text-sm text-center max-w-xs animate-fade-in">
          {error}
        </p>
      )}
      <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`
        relative p-3 rounded-full transition-all duration-200
        ${isListening 
          ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/50" 
          : "bg-[#222] text-[var(--foreground-muted)] hover:bg-[#333] hover:text-[var(--foreground)]"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      title={isListening ? "Stop listening" : "Start voice input"}
    >
      {/* Pulse animation when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          <span className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
        </>
      )}
      
      {/* Mic icon */}
      <svg
        className="w-5 h-5 relative z-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isListening ? (
          // Stop icon when listening
          <rect x="6" y="6" width="12" height="12" rx="1" strokeWidth={2} />
        ) : (
          // Mic icon when not listening
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        )}
      </svg>
    </button>
    </div>
  );
}

// Divider component for "or" section
export function VoiceInputDivider() {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[#333]" />
      <span className="text-[var(--foreground-subtle)] text-sm">or</span>
      <div className="flex-1 h-px bg-[#333]" />
    </div>
  );
}
