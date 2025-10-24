import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

export interface PDFOptions {
  format?: "A4" | "Letter";
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * Generate PDF reports from HTML
 */
export class PDFGenerator {
  /**
   * Generate PDF from HTML content
   */
  async generate(
    html: string,
    outputPath: string,
    options: PDFOptions = {}
  ): Promise<string> {
    console.log("📄 Generating PDF report...");

    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Launch headless browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Set content
      await page.setContent(html, {
        waitUntil: "networkidle0",
      });

      // Generate PDF
      await page.pdf({
        path: outputPath,
        format: options.format || "A4",
        landscape: options.landscape || false,
        margin: options.margin || {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
        printBackground: true,
      });

      await browser.close();

      // Get file size
      const stats = fs.statSync(outputPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`✅ PDF generated: ${outputPath} (${fileSizeMB} MB)`);

      return outputPath;
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
  }

  /**
   * Generate PDF with custom options
   */
  async generateWithOptions(
    html: string,
    outputPath: string,
    customOptions: {
      headerTemplate?: string;
      footerTemplate?: string;
      displayHeaderFooter?: boolean;
    }
  ): Promise<string> {
    console.log("📄 Generating PDF with custom options...");

    try {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        displayHeaderFooter: customOptions.displayHeaderFooter || false,
        headerTemplate: customOptions.headerTemplate || "",
        footerTemplate: customOptions.footerTemplate || "",
        margin: {
          top: customOptions.displayHeaderFooter ? "50mm" : "20mm",
          right: "15mm",
          bottom: customOptions.displayHeaderFooter ? "50mm" : "20mm",
          left: "15mm",
        },
      });

      await browser.close();

      const stats = fs.statSync(outputPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`✅ PDF generated: ${outputPath} (${fileSizeMB} MB)`);

      return outputPath;
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
  }
}
