#ifndef ALERT_GENERATOR_H
#define ALERT_GENERATOR_H

#include "../types.h"
#include "../json.hpp"

class AlertGenerator {
public:
    AlertGenerator() = default;

    nlohmann::json buildOutput(const AnalysisResult& result) const;
};

#endif // ALERT_GENERATOR_H
