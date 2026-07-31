import asyncHandler from "../middleware/asyncHandler.js";
import Contact from "../models/contactModel.js";
import { sendContactNotificationEmail } from "../utils/emailService.js";

/**
 * @desc    Create new contact message
 * @route   POST /api/contact
 * @access  Public
 */
const createContactMessage = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  // Persist to DB
  const contact = new Contact({ name, email, message });
  const createdContact = await contact.save();

  // Fire-and-forget: notify admin + auto-reply to sender
  sendContactNotificationEmail(name, email, message).catch((err) =>
    console.error("Contact email error:", err),
  );

  res.status(201).json({
    success: true,
    data: {
      _id: createdContact._id,
      name: createdContact.name,
      email: createdContact.email,
      message: createdContact.message,
      status: createdContact.status,
      createdAt: createdContact.createdAt,
    },
    message: "Contact message sent successfully",
  });
});

/**
 * @desc    Get all contact messages
 * @route   GET /api/contact
 * @access  Private/Admin
 */
const getContactMessages = asyncHandler(async (req, res) => {
  const contacts = await Contact.find({}).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: contacts,
    count: contacts.length,
  });
});

/**
 * @desc    Get contact message by ID
 * @route   GET /api/contact/:id
 * @access  Private/Admin
 */
const getContactMessageById = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (contact) {
    res.json({
      success: true,
      data: contact,
    });
  } else {
    res.status(404);
    throw new Error("Contact message not found");
  }
});

/**
 * @desc    Update contact message status
 * @route   PUT /api/contact/:id/status
 * @access  Private/Admin
 */
const updateContactStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (contact) {
    contact.status = status;

    if (status === "read" && !contact.readAt) {
      contact.readAt = new Date();
    } else if (status === "replied" && !contact.repliedAt) {
      contact.repliedAt = new Date();
    }

    const updatedContact = await contact.save();

    res.json({
      success: true,
      data: updatedContact,
      message: "Contact message status updated successfully",
    });
  } else {
    res.status(404);
    throw new Error("Contact message not found");
  }
});

/**
 * @desc    Delete contact message
 * @route   DELETE /api/contact/:id
 * @access  Private/Admin
 */
const deleteContactMessage = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (contact) {
    await Contact.deleteOne({ _id: contact._id });
    res.json({
      success: true,
      message: "Contact message removed",
    });
  } else {
    res.status(404);
    throw new Error("Contact message not found");
  }
});

export {
  createContactMessage,
  getContactMessages,
  getContactMessageById,
  updateContactStatus,
  deleteContactMessage,
};
