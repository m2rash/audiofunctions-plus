import React, { useState, useEffect, useRef } from "react";
import { Description, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Check, X, Music, Wind, Zap, Guitar } from "lucide-react";
import { useGraphContext } from "../../../context/GraphContext";
import { useInstruments } from "../../../context/InstrumentsContext";
import {
  getFunctionCount,
  getFunctionNameN,
  isFunctionActiveN,
  updateFunctionN,
  getFunctionInstrumentN,
  setFunctionInstrumentN
} from "../../../utils/graphObjectOperations";

const ShowHideFunctionsDialog = ({ isOpen, onClose }) => {
  const { functionDefinitions, setFunctionDefinitions } = useGraphContext();
  const functionDefinitionsBackup = useRef(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Announce status changes to screen readers
  const announceStatus = (message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Initialize backup when dialog opens
  useEffect(() => {
    if (isOpen) {
      functionDefinitionsBackup.current = functionDefinitions; // backup current function definitions
      announceStatus(`Toggle functions dialog opened. ${getFunctionCount(functionDefinitions)} functions available.`);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const toggleFunctionState = (index) => {
    const newIsActive = !isFunctionActiveN(functionDefinitions, index);
    const updatedDefinitions = updateFunctionN(functionDefinitions, index, { isActive: newIsActive });
    setFunctionDefinitions(updatedDefinitions);

    const functionName = getFunctionNameN(functionDefinitions, index) || `Function ${index + 1}`;
    announceStatus(`${functionName} ${newIsActive ? 'activated' : 'deactivated'}`);
  };

  const handleSave = () => {
    const activeCount = functionDefinitions.filter((_, index) => isFunctionActiveN(functionDefinitions, index)).length;
    announceStatus(`Changes saved. ${activeCount} functions are now active.`);
    onClose();
  };

  const handleCancel = () => {
    if (functionDefinitionsBackup.current !== null) {
      setFunctionDefinitions(functionDefinitionsBackup.current); // restore old function definitions
    }
    announceStatus('Changes cancelled.');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative" aria-modal="true" role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
      <div className="fixed inset-0 bg-overlay" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <DialogPanel className="w-full max-w-lg max-h-[90vh] bg-background rounded-lg shadow-lg flex flex-col">
          <div className="p-6 pb-4">
            <DialogTitle id="dialog-title" className="text-lg font-bold text-titles">
              Toggle Functions
            </DialogTitle>
            <Description id="dialog-description" className="text-descriptions">
              Activate or deactivate functions. Click on a function or press Enter to toggle its state. Use the instrument button to cycle through available instruments.
            </Description>
          </div>

          {/* Live region for status announcements */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            role="status"
          >
            {statusMessage}
          </div>

          <div className="flex-1 overflow-y-auto px-6" role="main" aria-label="Function list">
            {(functionDefinitions || []).length === 0 && (
              <div className="text-center py-8 text-descriptions">
                No functions defined. Please add functions first.
              </div>
            )}

            {(functionDefinitions || []).map((functionDef, index) => (
              <FunctionToggleItem
                key={functionDef.id}
                index={index}
                name={getFunctionNameN(functionDefinitions, index)}
                isActive={isFunctionActiveN(functionDefinitions, index)}
                onToggle={() => toggleFunctionState(index)}
                announceStatus={announceStatus}
              />
            ))}
          </div>

          <div className="px-6 py-4" role="group" aria-label="Dialog actions">
            <div className="flex justify-end items-center gap-2" role="group" aria-label="Dialog controls">
              <button
                onClick={handleCancel}
                className="btn-secondary sm:w-auto"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="btn-primary sm:w-auto"
              >
                Save
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

const FunctionToggleItem = ({ index, name, isActive, onToggle, announceStatus }) => {
  const { functionDefinitions, setFunctionDefinitions } = useGraphContext();
  const { availableInstruments } = useInstruments();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  const handleInstrumentChange = (e) => {
    e.stopPropagation(); // Prevent triggering the toggle

    const currentInstrument = getFunctionInstrumentN(functionDefinitions, index) || "clarinet"; // Default to clarinet instead of guitar
    const instrumentNames = availableInstruments.map(inst => inst.name);

    // Handle case where current instrument is not found in available instruments
    let currentIndex = instrumentNames.indexOf(currentInstrument);
    if (currentIndex === -1) {
      currentIndex = 0; // Default to first instrument if current not found
    }

    const nextIndex = (currentIndex + 1) % instrumentNames.length;
    const nextInstrument = instrumentNames[nextIndex];

    // console.log(`Changing instrument for function ${index + 1} from ${currentInstrument} to ${nextInstrument}`);
    // console.log(`Available instruments: ${instrumentNames.join(', ')}`);

    // Important: We should dispose of old instruments when switching
    // This should be handled in the audio engine, not here
    const updatedDefinitions = setFunctionInstrumentN(functionDefinitions, index, nextInstrument);
    setFunctionDefinitions(updatedDefinitions);

    const displayName = name || `Function ${index + 1}`;
    announceStatus(`${displayName} instrument changed to ${nextInstrument}`);
  };

  const handleInstrumentKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleInstrumentChange(e);
    }
  };

  const displayName = name || `Function ${index + 1}`;
  const currentInstrument = getFunctionInstrumentN(functionDefinitions, index) || "clarinet";

  // Get appropriate icon based on instrument
  const getInstrumentIcon = (instrumentName) => {
    switch (instrumentName) {
      case 'clarinet':
        return <Music className="w-4 h-4 text-icon" aria-hidden="true" />;
      case 'flute':
        return <Wind className="w-4 h-4 text-icon" aria-hidden="true" />;
      case 'organ':
        return <Zap className="w-4 h-4 text-icon" aria-hidden="true" />;
      case 'guitar':
        return <Guitar className="w-4 h-4 text-icon" aria-hidden="true" />;
      default:
        return <Music className="w-4 h-4 text-icon" aria-hidden="true" />;
    }
  };

  return (
    <div
      className="mb-2"
      role="group"
      aria-labelledby={`function-toggle-${index}-label`}
    >
      <div
        className={`p-4 border rounded-lg cursor-pointer transition-colors select-none ${
          isActive
            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
            : "border-gray-mddk bg-background hover:border-gray-md"
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={onToggle}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-pressed={isActive}
            aria-label={`Toggle ${displayName}. Currently ${isActive ? 'active' : 'inactive'}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isActive ? "bg-green-500" : "bg-gray-mddk"
              }`}
              aria-hidden="true"
            >
              {isActive ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <X className="w-4 h-4 text-white" />
              )}
            </div>
            <span
              id={`function-toggle-${index}-label`}
              className="text-sm font-medium text-descriptions"
            >
              {displayName}
            </span>
          </div>

          <button
            type="button"
            className="btn-neutral ml-2"
            onClick={handleInstrumentChange}
            onKeyDown={handleInstrumentKeyDown}
            aria-label={`Change instrument for ${displayName}. Current instrument: ${currentInstrument}. Press Enter to cycle to next instrument.`}
          >
            {getInstrumentIcon(currentInstrument)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShowHideFunctionsDialog;
