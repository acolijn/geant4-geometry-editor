import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleDownload,
  handleFileUpload,
} from '../jsonHandlers';

// Mock logger
vi.mock('../../../../utils/logger.js', () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
}));

describe('jsonHandlers', () => {
  describe('handleDownload', () => {
    it('creates a blob download link', () => {
      const createObjectURL = vi.fn(() => 'blob:test');
      const revokeObjectURL = vi.fn();
      const click = vi.fn();
      const mockAnchor = { click, href: '', download: '' };

      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;
      global.document = {
        createElement: vi.fn(() => mockAnchor),
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
      };

      handleDownload('{"test":1}', 'test.json');

      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('test.json');
    });
  });

  describe('handleFileUpload', () => {
    beforeEach(() => {
      // Mock FileReader for Node/Vitest environment
      global.FileReader = class {
        readAsText(file) {
          // Use file._content set by our mock File
          const text = file._content;
          setTimeout(() => {
            this.onload({ target: { result: text } });
          }, 0);
        }
      };
    });

    it('parses valid JSON from a file', async () => {
      const jsonText = JSON.stringify({ world: { name: 'World' } });
      const file = { name: 'test.json', _content: jsonText };

      const result = await handleFileUpload(file);
      expect(result.world.name).toBe('World');
    });

    it('rejects on invalid JSON', async () => {
      const file = { name: 'bad.json', _content: 'not json' };

      await expect(handleFileUpload(file)).rejects.toThrow('Failed to parse JSON');
    });
  });
});
import { describe, it, expect, vi } from 'vitest';
