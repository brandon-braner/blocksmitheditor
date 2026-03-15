import type { EditorPlugin, PluginContext } from '../PluginTypes.js';
import { HTMLExportPlugin } from './HTMLExportPlugin.js';

/**
 * Exports the editor document as a PDF using the browser's built-in
 * print functionality. Zero external dependencies.
 *
 * Internally renders the document to HTML via HTMLExportPlugin, then
 * opens a print-optimized window and triggers window.print().
 */
export class PDFExportPlugin implements EditorPlugin {
  readonly id = 'pdf-export';
  readonly name = 'PDF Export';

  private context: PluginContext | null = null;
  private htmlExporter: HTMLExportPlugin;

  constructor() {
    this.htmlExporter = new HTMLExportPlugin();
  }

  init(context: PluginContext): void {
    this.context = context;
    // Initialize the internal HTML exporter so it has access to editor state
    this.htmlExporter.init(context);
  }

  destroy(): void {
    this.htmlExporter.destroy();
    this.context = null;
  }

  /**
   * Open the browser print dialog with a formatted version of the document.
   * Users can choose "Save as PDF" from the native print dialog.
   */
  exportPDF(title = 'Blocksmith Document'): void {
    if (!this.context) throw new Error('PDFExportPlugin is not initialized');

    const html = this.htmlExporter.exportHTML(title);

    // Inject print-specific CSS overrides
    const printHTML = html.replace(
      '</style>',
      `
  @media print {
    body { margin: 0; padding: 20px; max-width: none; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
    a { color: #2563eb; text-decoration: none; }
    a::after { content: " (" attr(href) ")"; font-size: 0.8em; color: #6b7280; }
  }
  @page { margin: 2cm; }
</style>`
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Pop-up blocked — fall back to current window
      console.warn('[PDFExportPlugin] Pop-up blocked. Attempting in-page print.');
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(printHTML);
        iframeDoc.close();

        iframe.contentWindow?.addEventListener('afterprint', () => {
          document.body.removeChild(iframe);
        });

        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 250);
      }
      return;
    }

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to render before printing
    printWindow.addEventListener('load', () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    });

    this.context.eventBus.emit('document:exported', { format: 'pdf' });
  }
}
