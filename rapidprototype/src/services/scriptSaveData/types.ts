/**
 * Type definitions for the ScriptSaveData 
 */

/**
 * Supported file formats
 */
export enum SaveFormat {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  JSON = 'json',
  CSV = 'csv'
}

/**
 * Options for saving data
 */
export interface SaveOptions {
  /**
   * File format to save as
   */
  format: SaveFormat;
  
  /**
   * Optional prefix for the filename
   */
  filePrefix?: string;
  
  /**
   * Optional custom filename (if not provided, one will be generated)
   * If provided, this overrides filePrefix and timestampFormat
   */
  fileName?: string;
  
  /**
   * Optional subfolder within the main output directory
   */
  subfolder?: string;
  
  /**
   * Optional timestamp format for the filename (defaults to ISO string with colons replaced by hyphens)
   */
  timestampFormat?: boolean | string;
  
  /**
   * Optional encoding (defaults to 'utf8')
   */
  encoding?: BufferEncoding;
}

/**
 * Result of a save operation
 */
export interface SaveResult {
  /**
   * Whether the save was successful
   */
  success: boolean;
  
  /**
   * Path to the saved file (if successful)
   */
  filePath?: string;
  
  /**
   * Error message (if unsuccessful)
   */
  error?: string;
  
  /**
   * Format of the saved file
   */
  format: SaveFormat;
  
  /**
   * Timestamp of when the file was saved
   */
  timestamp: string;
} 