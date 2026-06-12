cmake_minimum_required(VERSION 3.16)
project(fraud_engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Add Release compilation optimizations
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O2")

# Gather all shared implementation source files
set(LIB_SOURCES
    src/graph/TransactionGraph.cpp
    src/detectors/CycleDetector.cpp
    src/detectors/VelocityDetector.cpp
    src/detectors/SmurfingDetector.cpp
    src/detectors/BalanceDrainDetector.cpp
    src/detectors/DormantActivityDetector.cpp
    src/detectors/RiskPropagationDetector.cpp
    src/scoring/RiskScorer.cpp
    src/ranking/TopKRanker.cpp
    src/output/AlertGenerator.cpp
    src/engine/FraudEngine.cpp
    src/generators/NormalUserGenerator.cpp
    src/generators/CycleGenerator.cpp
    src/generators/SmurfingGenerator.cpp
    src/generators/FraudRingGenerator.cpp
)

add_executable(fraud_engine src/main.cpp ${LIB_SOURCES})

# Target directories inclusion
target_include_directories(fraud_engine PRIVATE src)

# Test executable for the engine pipeline and detectors
add_executable(fraud_engine_tests tests/test_main.cpp ${LIB_SOURCES})
target_include_directories(fraud_engine_tests PRIVATE src)
