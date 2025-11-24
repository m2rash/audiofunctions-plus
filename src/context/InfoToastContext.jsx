import React, { createContext, useContext, useState } from 'react';
import InfoToast from '../components/ui/dialogs/InfoToast';

const InfoToastContext = createContext();

export const useInfoToast = () => {
  const context = useContext(InfoToastContext);
  if (!context) {
    throw new Error('useInfoToast must be used within an InfoToastProvider');
  }
  return context;
};

export const InfoToastProvider = ({ children }) => {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [timeout, setToastTimeout] = useState(10000);
  const [position, setPosition] = useState("fixed"); // "fixed" or "cursor"
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const showInfoToast = (message, timeout = 10000, options = {}) => {
    setMessage(message);
    setToastTimeout(timeout);
    setPosition(options.position || "fixed");
    
    if (options.cursorPosition) {
      setCursorPosition(options.cursorPosition);
    }
    
    setIsVisible(true);
  };

  const showLandmarkToast = (message, cursorPosition, timeout = 2000) => {
    showInfoToast(message, timeout, {
      position: "cursor",
      cursorPosition: cursorPosition
    });
  };

  const hideInfoToast = () => {
    setIsVisible(false);
  };

  return (
    <InfoToastContext.Provider value={{ 
      showInfoToast, 
      showLandmarkToast, 
      hideInfoToast 
    }}>
      {children}
      <InfoToast 
        message={message}
        isVisible={isVisible}
        onClose={hideInfoToast}
        timeout={timeout}
        position={position}
        cursorPosition={cursorPosition}
      />
    </InfoToastContext.Provider>
  );
};