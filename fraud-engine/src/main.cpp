#include "json.hpp"
#include "types.h"
#include "engine/FraudEngine.h"
#include <iostream>
#include <string>
#include <sstream>
#include <ctime>
#include <algorithm>

// ISO 8601 parser converting string datetime values to Epoch milliseconds
Timestamp parseTimestamp(const nlohmann::json& j) {
    if (j.is_number()) {
        return j.get<Timestamp>();
    } else if (j.is_string()) {
        std::string s = j.get<std::string>();
        // Standard ISO format expected: "YYYY-MM-DDTHH:MM:SS.mmmZ"
        if (s.length() >= 19) {
            int year = std::stoi(s.substr(0, 4));
            int month = std::stoi(s.substr(5, 2));
            int day = std::stoi(s.substr(8, 2));
            int hour = std::stoi(s.substr(11, 2));
            int min = std::stoi(s.substr(14, 2));
            int sec = std::stoi(s.substr(17, 2));

            std::tm tm = {};
            tm.tm_year = year - 1900;
            tm.tm_mon = month - 1;
            tm.tm_mday = day;
            tm.tm_hour = hour;
            tm.tm_min = min;
            tm.tm_sec = sec;
            tm.tm_isdst = 0;

            // Compute UTC seconds since epoch
#ifdef _WIN32
            time_t t = _mkgmtime(&tm);
#else
            time_t t = timegm(&tm);
#endif
            Timestamp ms = static_cast<Timestamp>(t) * 1000;

            // Check for fractional milliseconds (e.g. .000Z)
            size_t dot = s.find('.');
            if (dot != std::string::npos && dot + 3 < s.length()) {
                ms += std::stoi(s.substr(dot + 1, 3));
            }
            return ms;
        }
    }
    return 0;
}

int main() {
    // Disable stdin/stdout buffering synchronizations for high performance streaming
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(nullptr);

    FraudEngine engine;
    std::string line;

    while (std::getline(std::cin, line)) {
        // Skip whitespace-only messages
        if (line.empty() || std::all_of(line.begin(), line.end(), ::isspace)) {
            continue;
        }

        try {
            nlohmann::json j = nlohmann::json::parse(line);
            std::string cmd = j.value("command", "");

            if (cmd == "SYNC_GRAPH") {
                int accountsLoaded = 0;
                int transactionsLoaded = 0;

                if (j.contains("payload")) {
                    auto payload = j["payload"];
                    
                    // 1. Sync accounts
                    if (payload.contains("accounts") && payload["accounts"].is_array()) {
                        for (const auto& acc : payload["accounts"]) {
                            AccountId accNo = acc.value("accountNumber", "");
                            if (accNo.empty()) continue;

                            double balance = acc.value("balance", 0.0);
                            double riskScore = acc.value("riskScore", 0.0);
                            Timestamp lastActive = 0;

                            if (acc.contains("lastActiveAt")) {
                                lastActive = parseTimestamp(acc["lastActiveAt"]);
                            }

                            AccountNode node{accNo, balance, lastActive, riskScore};
                            engine.getGraph().getAccount(accNo) = node;
                            accountsLoaded++;
                        }
                    }

                    // 2. Sync history
                    if (payload.contains("transactions") && payload["transactions"].is_array()) {
                        for (const auto& txJson : payload["transactions"]) {
                            Transaction tx;
                            tx.from = txJson.value("sourceAccount", "");
                            tx.to = txJson.value("destinationAccount", "");
                            tx.amount = txJson.value("amount", 0.0);
                            tx.timestamp = parseTimestamp(txJson["timestamp"]);

                            engine.getGraph().addTransaction(tx);
                            transactionsLoaded++;
                        }
                    }
                }

                nlohmann::json res;
                res["responseType"] = "SYNC_GRAPH_RESULT";
                res["status"] = "success";
                res["accountsLoaded"] = accountsLoaded;
                res["transactionsLoaded"] = transactionsLoaded;

                std::cout << res.dump() << "\n";
                std::cout.flush();

            } else if (cmd == "ANALYZE_TRANSACTION") {
                if (j.contains("payload")) {
                    auto payload = j["payload"];
                    std::string txId = payload.value("transactionId", "");
                    
                    Transaction tx;
                    tx.from = payload.value("sourceAccount", "");
                    tx.to = payload.value("destinationAccount", "");
                    tx.amount = payload.value("amount", 0.0);
                    tx.timestamp = parseTimestamp(payload["timestamp"]);

                    AnalysisResult result = engine.process(tx, txId);

                    nlohmann::json outJson = engine.getAlertGen().buildOutput(result);
                    outJson["responseType"] = "ANALYZE_TRANSACTION_RESULT";

                    std::cout << outJson.dump() << "\n";
                    std::cout.flush();
                } else {
                    nlohmann::json errRes;
                    errRes["error"] = "parse_failed";
                    errRes["detail"] = "Missing payload field under ANALYZE_TRANSACTION command";
                    std::cout << errRes.dump() << "\n";
                    std::cout.flush();
                }
            } else {
                nlohmann::json errRes;
                errRes["error"] = "parse_failed";
                errRes["detail"] = "Invalid command supplied: " + cmd;
                std::cout << errRes.dump() << "\n";
                std::cout.flush();
            }
        } catch (const nlohmann::json::parse_error& e) {
            nlohmann::json errRes;
            errRes["error"] = "parse_failed";
            errRes["detail"] = std::string("JSON parse exception: ") + e.what();
            std::cout << errRes.dump() << "\n";
            std::cout.flush();
        } catch (const std::exception& e) {
            nlohmann::json errRes;
            errRes["error"] = "parse_failed";
            errRes["detail"] = std::string("Runtime exception: ") + e.what();
            std::cout << errRes.dump() << "\n";
            std::cout.flush();
        }
    }

    return 0;
}
