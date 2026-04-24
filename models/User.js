const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required']
    },
    cniNumber: {
        type: String,
        minlength: 9
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
    },
    dob: {
        type: Date,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['Client', 'Landowner', 'LRO', 'Notary', 'SuperAdmin'],
        default: 'Client'
    },
    profilePic: {
        type: String,
        default: 'default-profile.png'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: {
        type: String,
        select: false
    },
    verificationCodeExpires: {
        type: Date,
        select: false
    },
    // Security tracking
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    twoFactorEnabled: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active'
    },
    matricule: {
        type: String,
        trim: true
    },
    jurisdiction: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
