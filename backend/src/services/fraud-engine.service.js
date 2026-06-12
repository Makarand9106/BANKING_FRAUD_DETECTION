import { spawn } from 'child_process';
import logger from '../config/logger.js';

class FraudEngineService {
  constructor() {
    this.enginePath = process.env.FRAUD_ENGINE_PATH || '../fraud-engine/build/fraud_engine';
    this.engineProcess = null;
    this.pendingRequests = new Map(); // requestId -> { resolve, reject, timeout }
    this.lineBuffer = '';
    this.isReady = false;
    this.requestIdCounter = 1;

    this.startEngine();
  }

  startEngine() {
    logger.info(`Spawning C++ Fraud Engine binary: ${this.enginePath}`);
    this.engineProcess = spawn(this.enginePath, ['--mode', 'ipc']);

    this.engineProcess.stdout.on('data', (chunk) => {
      this._onData(chunk);
    });

    this.engineProcess.stderr.on('data', (data) => {
      logger.warn(`C++ Engine Stderr: ${data.toString().trim()}`);
    });

    this.engineProcess.on('error', (err) => {
      logger.error(`Failed to spawn C++ engine process: ${err.message}`);
      this._onCrash();
    });

    this.engineProcess.on('close', (code) => {
      logger.warn(`C++ Engine process exited with code ${code}`);
      this._onCrash();
    });

    // Set isReady = true after 500ms startup delay
    setTimeout(() => {
      this.isReady = true;
      logger.info('C++ Fraud Engine is ready for analysis requests.');
    }, 500);
  }

  /**
   * Evaluates a transaction's fraud score over IPC stdin/stdout stream.
   * @param {Object} transactionData - The payload details of the transfer
   * @returns {Promise<Object>} The analysis scores and signals
   */
  async analyze(transactionData) {
    if (!this.engineProcess) {
      throw new Error('Fraud engine is not running');
    }

    const requestId = transactionData.transactionId || `req_${this.requestIdCounter++}_${Date.now()}`;

    // Format transaction payload to match the expected schema of the C++ main loop
    const payload = {
      command: 'ANALYZE_TRANSACTION',
      payload: {
        transactionId: requestId,
        sourceAccount: transactionData.from,
        destinationAccount: transactionData.to,
        amount: Number(transactionData.amount),
        timestamp: transactionData.timestamp,
        balance: transactionData.balance || 0,
        lastActiveAt: transactionData.lastActiveAt || 0,
      },
    };

    const inputLine = JSON.stringify(payload) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const req = this.pendingRequests.get(requestId);
        if (req) {
          this.pendingRequests.delete(requestId);
          logger.warn(`Analysis timeout for request: ${requestId}`);
          reject(new Error('Transaction analysis timed out after 10s'));
        }
      }, 10000); // 10s timeout

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        this.engineProcess.stdin.write(inputLine);
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(err);
      }
    });
  }

  _onData(chunk) {
    this.lineBuffer += chunk.toString();
    const lines = this.lineBuffer.split('\n');
    
    // Hold back incomplete data slice
    this.lineBuffer = lines.pop();

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      try {
        const response = JSON.parse(cleanLine);
        const transactionId = response.transactionId;

        if (transactionId && this.pendingRequests.has(transactionId)) {
          const req = this.pendingRequests.get(transactionId);
          clearTimeout(req.timeout);
          this.pendingRequests.delete(transactionId);

          if (response.error) {
            req.reject(new Error(response.error));
          } else {
            req.resolve({
              totalScore: response.totalScore,
              severity: response.severity,
              decision: response.decision,
              signals: response.signals || [],
              topK: response.topK || [],
            });
          }
        }
      } catch (err) {
        logger.error(`Failed to parse C++ output line: "${cleanLine}". Error: ${err.message}`);
      }
    }
  }

  _onCrash() {
    logger.error('CRITICAL: C++ Fraud Engine process crashed or terminated.');
    this.isReady = false;

    // Fail all active request resolvers
    for (const [reqId, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timeout);
      req.reject(new Error('Engine crashed'));
    }
    this.pendingRequests.clear();

    if (this.engineProcess) {
      this.engineProcess.removeAllListeners();
      this.engineProcess = null;
    }

    // Restart engine after 3 seconds
    logger.info('Scheduling C++ engine restart in 3 seconds...');
    setTimeout(() => {
      this.startEngine();
    }, 3000);
  }

  shutdown() {
    if (this.engineProcess) {
      logger.info('Shutting down C++ Fraud Engine process...');
      this.engineProcess.removeAllListeners();
      this.engineProcess.kill('SIGTERM');

      const proc = this.engineProcess;
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch (err) {
          // ignore if already dead
        }
      }, 5000);

      this.engineProcess = null;
      this.isReady = false;
      
      for (const [reqId, req] of this.pendingRequests.entries()) {
        clearTimeout(req.timeout);
        req.reject(new Error('Engine shutting down'));
      }
      this.pendingRequests.clear();
    }
  }
}

export default new FraudEngineService();
