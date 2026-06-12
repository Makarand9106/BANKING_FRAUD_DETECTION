#ifndef TYPES_H
#define TYPES_H

#include <string>
#include <vector>
#include <utility>

using AccountId = std::string;
using Timestamp = long long; // Epoch milliseconds

struct Edge {
  AccountId to;
  double amount;
  Timestamp timestamp;
};

struct AccountNode {
  AccountId id;
  double balance;
  Timestamp lastActiveAt;
  double riskScore;
};

struct Transaction {
  AccountId from;
  AccountId to;
  double amount;
  Timestamp timestamp;
};

struct Signal {
  std::string type; // CYCLE | VELOCITY | SMURFING | DRAIN | DORMANT | PROPAGATION
  double score;
  std::string detail;
};

struct AnalysisResult {
  std::string transactionId;
  double totalScore;
  std::string severity;
  std::string decision;
  std::vector<Signal> signals;
  // topK populated by TopKRanker (vector of pairs of AccountId and riskScore)
  std::vector<std::pair<AccountId, double>> topK;
};

#endif // TYPES_H
