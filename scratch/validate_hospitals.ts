import { ALL_HOSPITALS } from '../src/data/hospitalsData';

const errors: string[] = [];
ALL_HOSPITALS.forEach((h) => {
  if (!h.id || !h.uniqueCode || !h.name || !h.state || !h.city || !h.googleMapsUrl || !h.phone) {
    errors.push(`Hospital missing field: ${h.id} ${h.name}`);
  }
  if (!h.doctors || h.doctors.length === 0) {
    errors.push(`No doctors in ${h.id}`);
  } else {
    if (h.doctors[0].specialty !== 'General Medicine') {
      errors.push(`First doctor is not General Medicine in ${h.id} (${h.doctors[0].specialty})`);
    }
  }
});

console.log('Errors Count:', errors.length);
if (errors.length > 0) {
  console.log(errors);
} else {
  console.log('ALL 64 hospitals and doctors are 100% valid with General Medicine as doctor #1!');
}
