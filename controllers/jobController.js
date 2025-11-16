const Job = require('../models/Job');
const Profession = require('../models/Profession');
const Company = require('../models/Company');

// Get all jobs
exports.getJobs = async (req, res) => {
  try {
    const { 
      profession, 
      city, 
      country, 
      jobType,
      status,
      company
    } = req.query;
    
    let query = {};
    
    if (profession) query.profession = profession;
    if (city) query.city = city;
    if (country) query.country = country;
    if (jobType) query.jobType = jobType;
    if (status) query.status = status;
    if (company) query.company = company;
    
    const jobs = await Job.find(query)
      .populate('company', 'companyName logo')
      .populate('profession', 'name category')
      .populate('city', 'name')
      .populate('country', 'name')
      .sort({ postedDate: -1 });
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get job by ID
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company', 'companyName logo description')
      .populate('profession', 'name category')
      .populate('city', 'name')
      .populate('country', 'name')
      .populate('province', 'name');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Increment views
    job.views += 1;
    await job.save();
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create job
exports.createJob = async (req, res) => {
  try {
    const profession = await Profession.findById(req.body.profession);
    if (!profession) {
      return res.status(404).json({
        success: false,
        message: 'Profession not found'
      });
    }
    
    // Get company for this user
    const company = await Company.findOne({ user: req.user.id });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company profile not found. Please create company profile first.'
      });
    }
    
    const job = await Job.create({
      ...req.body,
      company: company._id,
      professionName: profession.name
    });
    
    // Update company stats
    company.totalJobsPosted += 1;
    await company.save();
    
    res.status(201).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Apply to job
exports.applyToJob = async (req, res) => {
  try {
    const { jobId, professionalId, traineeId, notes } = req.body;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Check if already applied
    const existingApplication = job.applications.find(
      app => (app.professional && app.professional.toString() === professionalId) ||
             (app.trainee && app.trainee.toString() === traineeId)
    );
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Already applied to this job'
      });
    }
    
    job.applications.push({
      professional: professionalId || null,
      trainee: traineeId || null,
      notes: notes || '',
      status: 'pending'
    });
    
    job.applicationsCount += 1;
    await job.save();
    
    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Download CV (for companies)
exports.downloadCV = async (req, res) => {
  try {
    const { professionalId, traineeId } = req.query;
    
    let cvPath = '';
    let fileName = '';
    
    if (professionalId) {
      const Professional = require('../models/Professional');
      const professional = await Professional.findById(professionalId);
      if (professional && professional.cv) {
        cvPath = professional.cv;
        fileName = professional.cvFileName || 'cv.pdf';
      }
    } else if (traineeId) {
      const Trainee = require('../models/Trainee');
      const trainee = await Trainee.findById(traineeId);
      if (trainee && trainee.cv) {
        cvPath = trainee.cv;
        fileName = 'trainee-cv.pdf';
      }
    }
    
    if (!cvPath) {
      return res.status(404).json({
        success: false,
        message: 'CV not found'
      });
    }
    
    // In production, use proper file serving
    res.json({
      success: true,
      cvPath: cvPath,
      fileName: fileName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
