const ss = require('simple-statistics');

/**
 * Linear regression demand prediction
 * @param {Array} salesData - Array of { date, quantity } objects
 * @param {number} daysAhead - Number of days to predict
 * @returns {Object} prediction results
 */
const linearRegressionPrediction = (salesData, daysAhead = 30) => {
  if (!salesData || salesData.length < 2) {
    return { predictions: [], recommendedReorder: 0, accuracy: 0 };
  }

  // Convert dates to numeric x values (days from start)
  const startDate = new Date(salesData[0].date).getTime();
  const points = salesData.map((d, i) => [i, d.quantity]);

  // Calculate linear regression
  const regression = ss.linearRegression(points);
  const regressionLine = ss.linearRegressionLine(regression);

  // Generate predictions for next N days
  const lastIndex = salesData.length - 1;
  const predictions = [];

  for (let i = 1; i <= daysAhead; i++) {
    const predictedQty = Math.max(0, Math.round(regressionLine(lastIndex + i)));
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + i);

    predictions.push({
      date: futureDate,
      predictedQuantity: predictedQty,
      confidence: Math.max(0.5, 1 - (i / daysAhead) * 0.3), // Confidence decreases over time
    });
  }

  // Calculate MAPE (Mean Absolute Percentage Error) for accuracy
  let mape = 0;
  if (salesData.length > 3) {
    const testSize = Math.floor(salesData.length * 0.2);
    const trainSize = salesData.length - testSize;
    const trainPoints = points.slice(0, trainSize);
    const testPoints = points.slice(trainSize);

    const trainRegression = ss.linearRegression(trainPoints);
    const trainLine = ss.linearRegressionLine(trainRegression);

    const errors = testPoints.map(([x, actual]) => {
      const predicted = trainLine(x);
      return actual !== 0 ? Math.abs((actual - predicted) / actual) : 0;
    });

    mape = ss.mean(errors) * 100;
  }

  // Recommended reorder = sum of next 7 days predictions
  const next7Days = predictions.slice(0, 7);
  const recommendedReorder = next7Days.reduce((sum, p) => sum + p.predictedQuantity, 0);

  return {
    predictions,
    recommendedReorder,
    accuracy: Math.max(0, 100 - mape),
    algorithm: 'linear_regression',
  };
};

/**
 * Moving average prediction
 */
const movingAveragePrediction = (salesData, daysAhead = 30, windowSize = 7) => {
  if (!salesData || salesData.length < windowSize) {
    return { predictions: [], recommendedReorder: 0, accuracy: 0 };
  }

  const quantities = salesData.map((d) => d.quantity);
  const predictions = [];

  // Use last windowSize values as the moving average base
  const recentData = [...quantities];

  for (let i = 1; i <= daysAhead; i++) {
    const window = recentData.slice(-windowSize);
    const avg = ss.mean(window);
    const predictedQty = Math.max(0, Math.round(avg));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + i);

    predictions.push({
      date: futureDate,
      predictedQuantity: predictedQty,
      confidence: 0.75,
    });

    recentData.push(predictedQty);
  }

  const recommendedReorder = predictions.slice(0, 7).reduce((sum, p) => sum + p.predictedQuantity, 0);

  return {
    predictions,
    recommendedReorder,
    accuracy: 75,
    algorithm: 'moving_average',
  };
};

/**
 * Exponential smoothing prediction
 */
const exponentialSmoothingPrediction = (salesData, daysAhead = 30, alpha = 0.3) => {
  if (!salesData || salesData.length < 2) {
    return { predictions: [], recommendedReorder: 0, accuracy: 0 };
  }

  const quantities = salesData.map((d) => d.quantity);

  // Calculate smoothed values
  let smoothed = quantities[0];
  for (let i = 1; i < quantities.length; i++) {
    smoothed = alpha * quantities[i] + (1 - alpha) * smoothed;
  }

  const predictions = [];
  for (let i = 1; i <= daysAhead; i++) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + i);

    predictions.push({
      date: futureDate,
      predictedQuantity: Math.max(0, Math.round(smoothed)),
      confidence: Math.max(0.6, 0.9 - (i / daysAhead) * 0.2),
    });
  }

  const recommendedReorder = predictions.slice(0, 7).reduce((sum, p) => sum + p.predictedQuantity, 0);

  return {
    predictions,
    recommendedReorder,
    accuracy: 70,
    algorithm: 'exponential_smoothing',
  };
};

module.exports = {
  linearRegressionPrediction,
  movingAveragePrediction,
  exponentialSmoothingPrediction,
};
