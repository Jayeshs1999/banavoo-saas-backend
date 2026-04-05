/**
 * Calculate the number of days between two dates
 * @param {Date|string} checkIn - Check-in date
 * @param {Date|string} checkOut - Check-out date
 * @returns {number} Number of days (minimum 1)
 */
export const calculateDays = (checkIn, checkOut) => {
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};

/**
 * Calculate the number of months between two dates
 * For simplicity, we consider a month as 30 days
 * @param {Date|string} checkIn - Check-in date
 * @param {Date|string} checkOut - Check-out date
 * @returns {number} Number of months (minimum 1)
 */
export const calculateMonths = (checkIn, checkOut) => {
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  // Calculate months based on 30 days per month
  const months = Math.ceil(diffDays / 30);
  return Math.max(1, months);
};

/**
 * Calculate the total price for a booking
 * @param {Object} params - Price calculation parameters
 * @param {Date|string} params.checkIn - Check-in date
 * @param {Date|string} params.checkOut - Check-out date
 * @param {number} params.pricePerDay - Price per day
 * @param {number} params.pricePerMonth - Price per month
 * @param {"daily"|"monthly"} params.bookingType - Type of booking
 * @returns {{ totalPrice: number, days: number, months: number }}
 */
export const calculatePrice = ({
  checkIn,
  checkOut,
  pricePerDay,
  pricePerMonth,
  bookingType,
}) => {
  const days = calculateDays(checkIn, checkOut);
  const months = calculateMonths(checkIn, checkOut);

  let totalPrice;
  if (bookingType === "daily") {
    totalPrice = days * (pricePerDay || 0);
  } else if (bookingType === "monthly") {
    totalPrice = months * (pricePerMonth || 0);
  } else {
    // Default to daily calculation
    totalPrice = days * (pricePerDay || 0);
  }

  return {
    totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
    days,
    months,
  };
};

/**
 * Calculate price based on room's pricing period
 * @param {Object} params - Price calculation parameters
 * @param {Date|string} params.checkIn - Check-in date
 * @param {Date|string} params.checkOut - Check-out date
 * @param {number} params.price - Price per unit (day or month)
 * @param {"day"|"month"} params.pricingPeriod - Room's pricing period
 * @returns {{ totalPrice: number, days: number, months: number }}
 */
export const calculatePriceByPeriod = ({
  checkIn,
  checkOut,
  price,
  pricingPeriod,
}) => {
  const bookingType = pricingPeriod === "day" ? "daily" : "monthly";
  return calculatePrice({
    checkIn,
    checkOut,
    pricePerDay: pricingPeriod === "day" ? price : 0,
    pricePerMonth: pricingPeriod === "month" ? price : 0,
    bookingType,
  });
};

/**
 * Validate booking dates
 * @param {Date|string} checkIn - Check-in date
 * @param {Date|string} checkOut - Check-out date
 * @returns {{ valid: boolean, error?: string, checkInDate: Date, checkOutDate: Date }}
 */
export const validateBookingDates = (checkIn, checkOut) => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime())) {
    return {
      valid: false,
      error: "Invalid check-in date",
      checkInDate,
      checkOutDate,
    };
  }

  if (isNaN(checkOutDate.getTime())) {
    return {
      valid: false,
      error: "Invalid check-out date",
      checkInDate,
      checkOutDate,
    };
  }

  if (checkOutDate < checkInDate) {
    return {
      valid: false,
      error: "Check-out date must be after check-in date",
      checkInDate,
      checkOutDate,
    };
  }

  if (checkInDate < new Date()) {
    return {
      valid: false,
      error: "Check-in date cannot be in the past",
      checkInDate,
      checkOutDate,
    };
  }

  return {
    valid: true,
    checkInDate,
    checkOutDate,
  };
};

export default {
  calculateDays,
  calculateMonths,
  calculatePrice,
  calculatePriceByPeriod,
  validateBookingDates,
};
