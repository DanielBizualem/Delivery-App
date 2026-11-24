import mongoose from "mongoose";

// a courier has a document here only while available;
// availableSince decides their place in the first-come-first-served list
const courierAvailabilitySchema = new mongoose.Schema({
  courier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  availableSince: { type: Date, default: Date.now, index: true },
});

export default mongoose.model("CourierAvailability", courierAvailabilitySchema);