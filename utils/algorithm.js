/**
 * Generates a unique 6-digit verification code.
 * @returns {string}
 */
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generates a unique Land Code following the format: LandType-Region-OwnerID-PlotNo
 * Example: 10005-05-54321-7890
 * 
 * @param {string} landType - 10005 (Private) / 00050 (Public)
 * @param {string} regionCode - 01-10 (e.g., Littoral is 05)
 * @param {string} cniNumber - National ID number
 * @param {string} plotNumber - Official number from Titre Foncier
 * @returns {string}
 */
const generateLandCode = (landType, regionCode, cniNumber, plotNumber) => {
    const ownerId = cniNumber.slice(-5); // Last 5 digits of CNI
    return `${landType}-${regionCode}-${ownerId}-${plotNumber}`;
};

module.exports = {
    generateVerificationCode,
    generateLandCode
};
