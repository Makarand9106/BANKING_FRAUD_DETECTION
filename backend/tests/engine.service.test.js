import { spawn } from 'child_process';
import EventEmitter from 'events';

// Prepare mock streams before service loads
const mockStdin = {
  write: jest.fn()
};

class MockChildProcess extends EventEmitter {
  constructor() {
    super();
    this.stdin = mockStdin;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.kill = jest.fn();
    this.removeAllListeners = jest.fn();
  }
}

let mockActiveProcess = null;

// Mock child_process spawn
jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    mockActiveProcess = new MockChildProcess();
    return mockActiveProcess;
  })
}));

// Setup fake timers to capture constructor initialization timeout, then load the service
jest.useFakeTimers();
const fraudEngineService = require('../src/services/fraud-engine.service.js').default;
jest.advanceTimersByTime(500);
jest.useRealTimers();

describe('FraudEngineService IPC Bridge Suite', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    fraudEngineService.shutdown();
  });

  it('should start the C++ process on load and set isReady after delay', async () => {
    expect(spawn).toHaveBeenCalledWith(
      expect.any(String),
      ['--mode', 'ipc']
    );
    
    // Since it's already loaded and ready, verify isReady is true
    expect(fraudEngineService.isReady).toBe(true);
  });

  it('should successfully write payload and resolve when engine responds', async () => {
    jest.clearAllMocks();
    const tx = {
      from: 'ACC-A',
      to: 'ACC-B',
      amount: 1000,
      timestamp: Date.now(),
      balance: 10000,
      lastActiveAt: Date.now() - 3600000
    };

    const promise = fraudEngineService.analyze(tx);

    // Grab the request ID sent to stdin
    expect(mockStdin.write).toHaveBeenCalled();
    const lastWrite = mockStdin.write.mock.calls[0][0];
    const writtenJson = JSON.parse(lastWrite.trim());
    const reqId = writtenJson.payload.transactionId;

    // Simulate C++ engine stdout response
    const mockResponse = {
      transactionId: reqId,
      totalScore: 45,
      severity: 'MEDIUM',
      decision: 'REVIEW',
      signals: [{ type: 'CYCLE', score: 40, detail: 'Cycle detected' }],
      topK: []
    };

    mockActiveProcess.stdout.emit('data', JSON.stringify(mockResponse) + '\n');

    const result = await promise;
    expect(result.totalScore).toBe(45);
    expect(result.decision).toBe('REVIEW');
    expect(result.signals[0].type).toBe('CYCLE');
  });

  it('should handle partial line buffers and merge them', async () => {
    jest.clearAllMocks();
    const tx = {
      from: 'ACC-A',
      to: 'ACC-B',
      amount: 1000
    };

    const promise = fraudEngineService.analyze(tx);

    const lastWrite = mockStdin.write.mock.calls[0][0];
    const writtenJson = JSON.parse(lastWrite.trim());
    const reqId = writtenJson.payload.transactionId;

    const mockResponse = {
      transactionId: reqId,
      totalScore: 0,
      severity: 'NONE',
      decision: 'APPROVE',
      signals: [],
      topK: []
    };

    const fullStr = JSON.stringify(mockResponse) + '\n';
    const halfLen = Math.floor(fullStr.length / 2);

    // Emit first chunk
    mockActiveProcess.stdout.emit('data', fullStr.slice(0, halfLen));
    // Emit second chunk
    mockActiveProcess.stdout.emit('data', fullStr.slice(halfLen));

    const result = await promise;
    expect(result.totalScore).toBe(0);
    expect(result.decision).toBe('APPROVE');
  });

  it('should reject promise on transaction analysis timeout', async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const tx = {
      from: 'ACC-A',
      to: 'ACC-B',
      amount: 1000
    };

    const promise = fraudEngineService.analyze(tx);

    // Fast forward 10 seconds (10000ms)
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow('timed out');
  });

  it('should recover and restart C++ binary on unexpected crashes', () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Verify currently ready
    expect(fraudEngineService.isReady).toBe(true);

    // Trigger process close
    mockActiveProcess.emit('close', 1);

    // Expect service state changes to not ready
    expect(fraudEngineService.isReady).toBe(false);

    // Fast forward 3 seconds for scheduled restart
    jest.advanceTimersByTime(3000);
    
    // Verify spawn was called again (should be 1 time since mocks cleared)
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});
