import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = uri.includes('/Eduaitor') ? 'Eduaitor' : undefined;

const schoolSchema = new mongoose.Schema({ admin_email: String, admin_password: String, temp_password: String }, { strict: false });
const School = mongoose.model('InspectSchool', schoolSchema, 'schools');

const run = async () => {
  try {
    await mongoose.connect(uri, dbName ? { dbName } : {});
    const school = await School.findOne({ admin_email: 'school@admin.com' }).lean();
    console.log('School doc found:', !!school);
    if (school) {
      console.log('admin_email:', school.admin_email);
      console.log('temp_password:', school.temp_password);
      console.log('stored_password_hash:', school.admin_password?.slice(0, 20) + '...');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();
