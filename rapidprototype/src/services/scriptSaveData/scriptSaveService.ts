/**
 * ScriptSaveService
 * 
 * A service for saving data to files in different formats.
 * This service is primarily used by scripts to save test data.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DATA_DIRECTORY } from '../../config';
import { SaveFormat, SaveOptions, SaveResult } from './types';

export class ScriptSaveService {
  /**
   * Default encoding for saved files
   */
  private static readonly DEFAULT_ENCODING: BufferEncoding = 'utf8';

  /**
   * Get the full path to the output directory
   * @returns The absolute path to the output directory
   */
  private getOutputDirectory(subfolder?: string): string {
    // Use the data directory from config
    let outputDir = DATA_DIRECTORY;

    // If a subfolder is provided, append it to the path
    if (subfolder) {
      outputDir = path.join(outputDir, subfolder);
    }
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    return outputDir;
  }

  /**
   * Get the file extension for a given format
   * @param format - The format to get the extension for
   * @returns The file extension including the dot
   */
  private getFileExtension(format: SaveFormat): string {
    switch (format) {
      case SaveFormat.TEXT:
        return '.txt';
      case SaveFormat.MARKDOWN:
        return '.md';
      case SaveFormat.JSON:
        return '.json';
      case SaveFormat.CSV:
        return '.csv';
      default:
        return '.txt';
    }
  }

  /**
   * Format the data according to the specified format
   * @param data - The data to format
   * @param format - The format to use
   * @returns The formatted data as a string
   */
  private formatData(data: any, format: SaveFormat): string {
    switch (format) {
      case SaveFormat.JSON:
        return JSON.stringify(data, null, 2);
      case SaveFormat.TEXT:
      case SaveFormat.MARKDOWN:
      case SaveFormat.CSV:
      default:
        // For text, markdown, and csv if data is an object, stringify it
        return typeof data === 'object' 
          ? JSON.stringify(data, null, 2) 
          : String(data);
    }
  }

  /**
   * Generate a filename based on the options
   * @param options - Save options
   * @returns A generated filename
   */
  private generateFilename(options: SaveOptions): string {
    // If a custom filename is provided, use it
    if (options.fileName) {
      // Ensure it has the correct extension
      const ext = this.getFileExtension(options.format);
      return options.fileName.endsWith(ext) 
        ? options.fileName 
        : `${options.fileName}${ext}`;
    }
    
    // Generate a timestamp
    let timestamp: string;
    if (options.timestampFormat === false) {
      // Don't include a timestamp
      timestamp = '';
    } else if (typeof options.timestampFormat === 'string') {
      // Format the timestamp according to the provided format
      // This is a simplified version; you might want to use a date library for more complex formats
      timestamp = `-${new Date().toISOString().replace(/:/g, '-')}`;
    } else {
      // Default timestamp format (ISO with colons replaced)
      timestamp = `-${new Date().toISOString().replace(/:/g, '-')}`;
    }
    
    // Combine prefix and timestamp with the extension
    const prefix = options.filePrefix || 'data';
    const ext = this.getFileExtension(options.format);
    
    return `${prefix}${timestamp}${ext}`;
  }

  /**
   * Save data to a file
   * @param data - The data to save
   * @param options - Options for saving the data
   * @returns A result object with information about the save operation
   */
  public saveData(data: any, options: SaveOptions): SaveResult {
    try {
      // Get the output directory
      const outputDir = this.getOutputDirectory(options.subfolder);
      
      // Generate the filename
      const filename = this.generateFilename(options);
      
      // Format the data
      const formattedData = this.formatData(data, options.format);
      
      // Combine directory and filename
      const filePath = path.join(outputDir, filename);
      
      // Write the file
      fs.writeFileSync(filePath, formattedData, {
        encoding: options.encoding || ScriptSaveService.DEFAULT_ENCODING
      });
      
      // Return success result
      return {
        success: true,
        filePath,
        format: options.format,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Return error result
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        format: options.format,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Save text data to a file
   * @param data - The text data to save
   * @param filePrefix - Optional prefix for the filename
   * @returns A result object with information about the save operation
   */
  public saveText(data: string, filePrefix?: string): SaveResult {
    return this.saveData(data, {
      format: SaveFormat.TEXT,
      filePrefix
    });
  }

  /**
   * Save markdown data to a file
   * @param data - The markdown data to save
   * @param filePrefix - Optional prefix for the filename
   * @returns A result object with information about the save operation
   */
  public saveMarkdown(data: string, filePrefix?: string): SaveResult {
    return this.saveData(data, {
      format: SaveFormat.MARKDOWN,
      filePrefix
    });
  }

  /**
   * Save JSON data to a file
   * @param data - The data to save as JSON
   * @param filePrefix - Optional prefix for the filename
   * @returns A result object with information about the save operation
   */
  public saveJson(data: any, filePrefix?: string): SaveResult {
    return this.saveData(data, {
      format: SaveFormat.JSON,
      filePrefix
    });
  }

  /**
   * Save CSV data to a file
   * @param data - The CSV data to save
   * @param filePrefix - Optional prefix for the filename
   * @returns A result object with information about the save operation
   */
  public saveCsv(data: string, filePrefix?: string): SaveResult {
    return this.saveData(data, {
      format: SaveFormat.CSV,
      filePrefix,
    });
  }
} 