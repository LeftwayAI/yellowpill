// Speech-to-text hook using Web Speech API
// Works in Chrome, Edge, Safari (not Firefox)

import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearError: () => void;
}

export function useSpeechToText(): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  // Initialize speech recognition once on mount
  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionClass =
      typeof window !== "undefined"
        ? (window as typeof window & { 
            SpeechRecognition?: typeof SpeechRecognition;
            webkitSpeechRecognition?: typeof SpeechRecognition;
          }).SpeechRecognition ||
          (window as typeof window & { 
            webkitSpeechRecognition?: typeof SpeechRecognition;
          }).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionClass) {
      console.log("Speech recognition not supported");
      return;
    }

    setIsSupported(true);
    
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Speech recognition started");
      isListeningRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim results while speaking
      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      
      // Handle specific errors
      if (event.error === "network") {
        setError("Network error. Chrome uses Google's servers for speech recognition - check your connection.");
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied. Please allow microphone access and try again.");
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === "audio-capture") {
        setError("No microphone found. Please connect a microphone and try again.");
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        // Other errors - stop listening
        isListeningRef.current = false;
        setIsListening(false);
      }
      // 'aborted' and 'no-speech' are normal - don't stop
    };

    recognition.onend = () => {
      console.log("Speech recognition ended, wasListening:", isListeningRef.current);
      // If we were supposed to be listening, restart (handles auto-stop after silence)
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.log("Could not restart recognition:", e);
          isListeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        isListeningRef.current = false;
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    setTranscript("");
    setError(null);
    isListeningRef.current = true;
    
    try {
      recognition.start();
    } catch (err) {
      // Might already be started
      console.error("Failed to start recognition:", err);
    }
  }, []);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    isListeningRef.current = false;
    
    try {
      recognition.stop();
    } catch (error) {
      console.error("Failed to stop recognition:", error);
    }
    
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearError,
  };
}
