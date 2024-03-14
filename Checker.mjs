// The base class for different types of file checkers.
export class Checker {

    /**  Constructor for base class
     * @param {Buffer} requirementsFileBuffer - Contents of the requirements file.
     */
    constructor() {
        // Initialization code goes here
    }

    
    /**
     * checkSubmission method
     * Checks a file or files in a dir against the requriements
     * @param {string} labDirPath 
     * @param {string} labPart 
     */
    async checkSubmission(
        labDirPath, // full path to a student's lab folder or lab part subfolder.
        labPart,    // lab part number
    )
    {}
}
