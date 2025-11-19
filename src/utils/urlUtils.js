/**
 * Decode base64 URL parameter from import hash to function definitions and graph settings
 * @param {string} base64String - Base64 encoded string
 * @returns {Object|null} Decoded data or null if invalid
 */
export function decodeFromImportLink(base64String) {
  if (!base64String) return null;
  
  try {
    // Convert URL-safe base64 back to standard base64
    let decodedString = base64String.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if necessary (removed by encodeToImportLink)
    while (decodedString.length % 4) {
      decodedString += '=';
    }
    
    // Decode with fallback for environments without atob
    const jsonString = typeof atob !== 'undefined' 
      ? atob(decodedString)
      : Buffer.from(decodedString, 'base64').toString('utf-8');

    const data = JSON.parse(jsonString);
    
    // Validate structure
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.functions)) return null;
    if (!data.graphSettings || typeof data.graphSettings !== 'object') return null;
    
    // Validate defaultView if present
    if (data.graphSettings.defaultView) {
      if (!Array.isArray(data.graphSettings.defaultView) || 
          data.graphSettings.defaultView.length !== 4) {
        console.warn('Invalid defaultView format, using defaults');
        data.graphSettings.defaultView = [-10, 10, 10, -10];
      }
      
      // Ensure all values are finite numbers
      const [xMin, xMax, yMax, yMin] = data.graphSettings.defaultView;
      if (!isFinite(xMin) || !isFinite(xMax) || !isFinite(yMin) || !isFinite(yMax)) {
        console.warn('Invalid defaultView values, using defaults');
        data.graphSettings.defaultView = [-10, 10, 10, -10];
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error decoding import link:', error);
    return null;
  }
}

/**
 * Get URL hash parameter value (after #)
 * @param {string} paramName - Parameter name
 * @returns {string|null} Parameter value or null
 */
export function getHashParameter(paramName) {
  const hash = window.location.hash.substring(1); // Remove #
  const params = new URLSearchParams(hash);
  return params.get(paramName);
}

/**
 * Clear hash parameter after loading
 */
export function clearHashParameter() {
  const url = new URL(window.location);
  url.hash = '';
  window.history.replaceState({}, '', url);
}

/**
 * Encode data to base64 for URL sharing
 * @param {Object} data - Data object to encode
 * @returns {string|null} Base64 encoded string or null if error
 */
export function encodeToImportLink(data) {
  try {
    // Validate data structure before encoding
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be an object');
    }

    console.log('Encoding data to import link:', data);
    
    const jsonString = JSON.stringify(data);
    
    // Encode with fallback for environments without btoa
    const base64String = typeof btoa !== 'undefined'
      ? btoa(jsonString)
      : Buffer.from(jsonString, 'utf-8').toString('base64');
    
    // Ensure URL-safe base64 encoding
    const base64String_final = base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    console.log('Encoded import link data:', base64String_final);
    return base64String_final;
  } catch (error) {
    console.error('Error encoding data to import link:', error);
    return null;
  }
}