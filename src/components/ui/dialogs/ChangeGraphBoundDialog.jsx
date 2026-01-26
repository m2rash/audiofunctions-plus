import { useEffect, useRef, useState } from "react";
import { Description, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useGraphContext } from "../../../context/GraphContext";
import { useInfoToast } from "../../../context/InfoToastContext";

const ChangeGraphBoundDialog = ({ isOpen, onClose }) => {
    const { graphBounds, setGraphBounds, focusChart, graphSettings } = useGraphContext();
    const { showInfoToast } = useInfoToast();
    const graphBoundsBackup = useRef(null);
    const [inputErrors, setInputErrors] = useState({});
    const [statusMessage, setStatusMessage] = useState('');

    // Check if there are any errors that prevent saving
    const hasErrors = Object.keys(inputErrors).length > 0;

    useEffect(() => {
        if (isOpen) {
            graphBoundsBackup.current = graphBounds; // backup current graphBounds
            setInputErrors({}); // Clear errors when opening dialog
            // console.log("Open: ", graphBoundsBackup.current);
            announceStatus("Graph bounds dialog opened. Use Tab to navigate between fields.");
        }
    }, [isOpen]);

    // Announce status changes to screen readers
    const announceStatus = (message) => {
        setStatusMessage(message);
        setTimeout(() => setStatusMessage(''), 3000);
    };

    // Validation functions
    const validateBoundValue = (value, field) => {
        const errors = [];

        // Check if value is empty or just a minus sign
        if (value === '' || value === '-') {
            errors.push("Value cannot be empty");
            return errors;
        }

        // Check if it's a valid number
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            errors.push("Must be a valid number");
            return errors;
        }

        // Check for infinite values
        if (!isFinite(numValue)) {
            errors.push("Value cannot be infinite");
            return errors;
        }

        return errors;
    };

    const validateBounds = (bounds) => {
        const errors = {};

        // Get min and max bound differences from graph settings
        const minDiff = graphSettings?.minBoundDifference || 0.1;
        const maxDiff = graphSettings?.maxBoundDifference || 100;

        // Validate individual fields
        ['xMin', 'xMax', 'yMin', 'yMax'].forEach(field => {
            const fieldErrors = validateBoundValue(bounds[field], field);
            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
            }
        });

        // If individual validations passed, check relationships
        if (Object.keys(errors).length === 0) {
            const xMin = parseFloat(bounds.xMin);
            const xMax = parseFloat(bounds.xMax);
            const yMin = parseFloat(bounds.yMin);
            const yMax = parseFloat(bounds.yMax);

            // Check if min values are less than max values FIRST
            const xOrderCorrect = xMin < xMax;
            const yOrderCorrect = yMin < yMax;

            if (!xOrderCorrect) {
                errors.xMin = errors.xMin || [];
                errors.xMax = errors.xMax || [];
                errors.xMin.push("xMin must be less than xMax");
                errors.xMax.push("xMax must be greater than xMin");
            }

            if (!yOrderCorrect) {
                errors.yMin = errors.yMin || [];
                errors.yMax = errors.yMax || [];
                errors.yMin.push("yMin must be less than yMax");
                errors.yMax.push("yMax must be greater than yMin");
            }

            // Only check ranges if the order is correct
            if (xOrderCorrect) {
                const xRange = xMax - xMin;

                if (xRange < minDiff) {
                    errors.xMin = errors.xMin || [];
                    errors.xMax = errors.xMax || [];
                    errors.xMin.push(`X range is too small (minimum ${minDiff})`);
                    errors.xMax.push(`X range is too small (minimum ${minDiff})`);
                }

                if (xRange > maxDiff) {
                    errors.xMin = errors.xMin || [];
                    errors.xMax = errors.xMax || [];
                    errors.xMin.push(`X range is too large (maximum ${maxDiff})`);
                    errors.xMax.push(`X range is too large (maximum ${maxDiff})`);
                }
            }

            if (yOrderCorrect) {
                const yRange = yMax - yMin;

                if (yRange < minDiff) {
                    errors.yMin = errors.yMin || [];
                    errors.yMax = errors.yMax || [];
                    errors.yMin.push(`Y range is too small (minimum ${minDiff})`);
                    errors.yMax.push(`Y range is too small (minimum ${minDiff})`);
                }

                if (yRange > maxDiff) {
                    errors.yMin = errors.yMin || [];
                    errors.yMax = errors.yMax || [];
                    errors.yMin.push(`Y range is too large (maximum ${maxDiff})`);
                    errors.yMax.push(`Y range is too large (maximum ${maxDiff})`);
                }
            }
        }

        return errors;
    };

    const handleCancel = () => {
        // console.log("Cancel: ", graphBoundsBackup.current);
        if (graphBoundsBackup.current !== null) {
            setGraphBounds(graphBoundsBackup.current); // reuse old graph bounds
        }
        setInputErrors({}); // Clear errors when canceling
        onClose();
        showInfoToast("Changes discarded", 1500);
        setTimeout(() => focusChart(), 100);
    };

    const handleAccept = () => {
        // Prevent saving if there are errors
        if (hasErrors) {
            announceStatus("Cannot save: Please fix all errors before saving.");
            return;
        }

        onClose();
        showInfoToast("Graph bounds updated", 1500);
        setTimeout(() => focusChart(), 100);
    };

    const handleClose = () => {
        if (hasErrors) {
            announceStatus("Graph bounds have errors. Changes discarded.");
            handleCancel();
            return;
        }

        onClose();
        setTimeout(() => focusChart(), 100);
    };

    const handleNumberChange = (field, value) => {
        // Allow empty strings, minus signs and valid numbers during typing
        if (value === '' || value === '-' || !isNaN(parseFloat(value))) {
            const newBounds = {
                ...graphBounds,
                [field]: value === '' || value === '-' ? value : parseFloat(value)
            };
            setGraphBounds(newBounds);

            // Validate in real-time but only show errors after user interaction
            const errors = validateBounds(newBounds);
            setInputErrors(errors);
        }
    };

    const handleBlur = (field, value) => {
        // On blur, ensure a valid value is set
        let finalValue = value;

        if (value === '' || value === '-') {
            finalValue = 0;
            const newBounds = { ...graphBounds, [field]: 0 };
            setGraphBounds(newBounds);
        }

        // Validate after blur to show any errors
        const currentBounds = { ...graphBounds, [field]: finalValue };
        const errors = validateBounds(currentBounds);
        setInputErrors(errors);

        if (errors[field]) {
            announceStatus(`Error in ${field}: ${errors[field].join('. ')}`);
        }
    };

    const handleKeyDown = (e) => {
        // Enter: Try to save
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAccept();
        }
        // Escape: Cancel
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, hasErrors]);

    const renderBoundInput = (field, label, id) => {
        const hasError = inputErrors[field] && inputErrors[field].length > 0;
        const errorMessage = hasError ? inputErrors[field].join('. ') : null;

        return (
            <div className="w-32"> {/* Fixed width container for input */}
                <div className={`text-input-outer ${hasError ? 'error-border error-input' : ''}`}>
                    <div className="text-input-label">
                        {label}:
                    </div>
                    <input
                        id={id}
                        type="number"
                        step="any"
                        value={graphBounds[field]}
                        onChange={(e) => handleNumberChange(field, e.target.value)}
                        onBlur={(e) => handleBlur(field, e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label={label}
                        aria-invalid={hasError ? 'true' : 'false'}
                        aria-errormessage={hasError ? `${id}-error` : undefined}
                        className="text-input-inner"
                    />
                </div>
                {hasError && (
                    <div
                        id={`${id}-error`}
                        className="error-message mt-1 text-sm break-words w-40 -ml-4"
                        role="alert"
                        aria-live="assertive"
                        aria-atomic="true"
                    >
                        <span className="error-icon" aria-hidden="true">⚠️</span>
                        {errorMessage}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            aria-modal="true"
            role="dialog"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
        >
            <div className="fixed inset-0 bg-overlay" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
                <DialogPanel className="w-full max-w-lg bg-background rounded-lg p-6 shadow-lg">
                    <DialogTitle id="dialog-title" className="text-lg font-bold text-titles">
                        Change Graph-Bound
                    </DialogTitle>
                    <Description id="dialog-description" className="text-descriptions">
                        Here you can edit the displayed graph bounds. Press Enter to save, Escape to cancel.
                    </Description>

                    {/* Live region for status announcements */}
                    <div
                        aria-live="polite"
                        aria-atomic="true"
                        className="sr-only"
                        role="status"
                    >
                        {statusMessage}
                    </div>

                    <br />

                    <div className="grid grid-cols-3 gap-4 items-center" role="group" aria-label="Graph bounds inputs">
                        {/* yMax oben in der Mitte */}
                        <div className="col-span-3 flex justify-center">
                            {renderBoundInput('yMax', 'Ymax', 'maxY')}
                        </div>

                        {/* xMin und xMax zentriert */}
                        <div className="col-span-3 flex justify-center gap-16">
                            {renderBoundInput('xMin', 'Xmin', 'minX')}
                            {renderBoundInput('xMax', 'Xmax', 'maxX')}
                        </div>

                        {/* yMin unten in der Mitte */}
                        <div className="col-span-3 flex justify-center">
                            {renderBoundInput('yMin', 'Ymin', 'minY')}
                        </div>
                    </div>

                    <br />

                    <div className="flex justify-end items-center mt-4 gap-2" role="group" aria-label="Dialog controls">
                        <button
                            onClick={handleCancel}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleAccept}
                            className="btn-primary"
                            disabled={hasErrors}
                            aria-disabled={hasErrors}
                            title={hasErrors ? "Please fix all errors before saving" : "Save changes and close"}
                        >
                            Accept
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

export default ChangeGraphBoundDialog;
