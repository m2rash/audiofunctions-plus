import React, { useEffect, useRef } from "react";
import { Description, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useGraphContext } from "../../../context/GraphContext";

const MovementAdjustmentsDialog = ({ isOpen, onClose }) => {
  const { PlayFunction, setPlayFunction, stepSize, setStepSize } = useGraphContext();
  const speedBackup = useRef(null);
  const stepSizeBackup = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      speedBackup.current = PlayFunction.speed;
      stepSizeBackup.current = stepSize;
      console.log("Open: speed =", speedBackup.current, "stepSize =", stepSizeBackup.current);
    }
  }, [isOpen, PlayFunction.speed, stepSize]);

  const handleCancel = () => {
    console.log("Cancel: restoring speed =", speedBackup.current, "stepSize =", stepSizeBackup.current);
    if (speedBackup.current !== null) {
      setPlayFunction(prev => ({ ...prev, speed: speedBackup.current }));
    }
    if (stepSizeBackup.current !== null) {
      setStepSize(stepSizeBackup.current);
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (onClose) {
        onClose();
      }
    }
  };

  const handleSpeedChange = (value) => {
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setPlayFunction(prev => ({ ...prev, speed: value === '' ? value : parseFloat(value) }));
    }
  };

  const handleStepSizeChange = (value) => {
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setStepSize(value === '' ? value : parseFloat(value));
    }
  };

  const handleSpeedBlur = (value) => {
    if (value === '' || value === '-') {
      setPlayFunction(prev => ({ ...prev, speed: 0 }));
    }
  };

  const handleStepSizeBlur = (value) => {
    if (value === '' || value === '-') {
      setStepSize(0.1);
    }
    if (value === '0') {
      setStepSize(0.01); // Prevent zero step size - I didn't find a better solution....
    }
  };

  const getSpeedStep = (currentValue) => {
    const value = parseFloat(currentValue) || 0;
    if (value <= 1) return 0.1;
    if (value <= 10) return 0.5;
    return 1;
  };

  const getStepSizeStep = (currentValue) => {
    const value = parseFloat(currentValue) || 0;
    if (value <= 1) return 0.1;
    return 1;
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      aria-modal="true" 
      role="dialog"
    >
      <div className="fixed inset-0 bg-overlay" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <DialogPanel className="w-full max-w-lg bg-background rounded-lg p-6 shadow-lg">
          <DialogTitle className="text-lg font-bold text-titles">
            Movement Adjustments
          </DialogTitle>
          <Description className="text-descriptions">
            Adjust movement and navigation settings for the graph.
          </Description>

          <br />

          <div className="space-y-4">
            {/* Speed Input */}
            <div className="text-input-outer">
              <div className="text-input-label">
                Speed:
              </div>
              <input
                id="speed-input"
                type="number"
                step={getSpeedStep(PlayFunction.speed)}
                min="0"
                value={PlayFunction.speed}
                onChange={(e) => handleSpeedChange(e.target.value)}
                onBlur={(e) => handleSpeedBlur(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-input-inner"
                aria-label="Movement speed"
              />
            </div>

            {/* Step Size Input */}
            <div className="text-input-outer">
              <div className="text-input-label">
                Step Size:
              </div>
              <input
                id="stepsize-input"
                type="number"
                step={getStepSizeStep(stepSize)}
                min="0"
                value={stepSize}
                onChange={(e) => handleStepSizeChange(e.target.value)}
                onBlur={(e) => handleStepSizeBlur(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-input-inner"
                aria-label="Navigation step size"
              />
            </div>
          </div>

          <br />

          <div className="flex justify-end items-center mt-4 gap-2">
            <button
              onClick={handleCancel}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              onClick={onClose}
              className="btn-primary"
            >
              Accept
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default MovementAdjustmentsDialog;