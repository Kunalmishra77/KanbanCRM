// Synthetic data only. The suite mocks /api so it can never touch the real database.
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString();
const u = (id, firstName, lastName, email, userType = 'employee') => ({ id, firstName, lastName, email, userType, role: 'editor', profileImageUrl: null, shareholdingPercent: '0', createdAt: iso(-90), updatedAt: iso(-1) });

export const users = [
  u('u-founder', 'Anant', 'Sanadhya', 'anant@x.com', 'founder'),
  u('u-pooja', 'Pooja', 'Singh', 'razorbill2018@gmail.com'),
  u('u-ranveer', 'ranveer', 'razorveda', 'ranveer@x.com'),
  u('u-hr', 'Mahi', 'HR', 'hr@x.com', 'hr'),
  u('u-acc', 'Aarti', 'Accountant', 'acc@x.com', 'accountant'),
];

const mkClient = (i, name, stage, owner) => ({ id: `c${i}`, name, ownerId: owner, industry: 'Retail', stage, averageProgress: '40', expectedRevenue: '100000', revenueTotal: '25000', notes: '', proposalFileName: null, proposalFileData: null, contactName: 'Contact ' + i, contactEmail: `c${i}@x.com`, contactPhone: '9999999999', contractEndDate: iso(40), createdAt: iso(-20), updatedAt: iso(-1) });
export const clients = [
  mkClient(1, 'Hot Co', 'Hot', 'u-pooja'),
  mkClient(2, 'Warm Co', 'Warm', 'u-pooja'),
  mkClient(3, 'Cold Co', 'Cold', 'u-ranveer'),
  mkClient(4, 'Dropped Co with a very long company name that must wrap on phones', 'Dropped', 'u-founder'),
];
const st = (i, clientId, assignedTo, person, status, due) => ({ id: `s${i}`, clientId, title: `Story ${i} with a reasonably long title to test wrapping`, description: 'desc', assignedTo, priority: 'Medium', estimatedEffortHours: 2, actualHoursSpent: '0', dueDate: iso(due), status, progressPercent: 0, person, tags: [], createdAt: iso(-5), updatedAt: iso(-1) });
export const stories = [
  st(1, 'c1', 'u-pooja', 'Pooja Singh', 'To Do', 3),
  st(2, 'c1', 'u-pooja', 'Razor Bill', 'In Progress', -2), // stale legacy text: the id must win
  st(3, 'c2', 'u-pooja', 'Pooja Singh', 'Done', 1),
  st(4, 'c3', 'u-ranveer', 'ranveer razorveda', 'To Do', 5),
  st(5, 'c3', 'u-ranveer', 'ranveer razorveda', 'Review', 9),
  st(6, 'c3', null, 'ranveer razorveda', 'To Do', 4), // unlinked legacy story: exact name only
  st(7, 'c2', null, 'Unassigned', 'To Do', 4),
];
export const leads = ['New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Hold', 'Won', 'Lost'].map((stage, i) => ({ id: `l${i}`, name: `Lead ${i}`, contactName: 'X', contactEmail: 'l@x.com', contactPhone: '1', industry: 'IT', stage, estimatedValue: '5000', notes: '', ownerId: 'u-founder', assignedTo: 'u-pooja', createdAt: iso(-3), updatedAt: iso(-1) }));
export const announcements = [{ id: 'a1', title: 'Holiday', content: 'Office closed', priority: 'normal', createdBy: 'u-founder', createdAt: iso(-1), updatedAt: iso(-1), isActive: true }];
export const activity = [{ id: 'act1', entityType: 'story', entityId: 's1', action: 'created', userId: 'u-founder', details: 'Created story', createdAt: iso(-1) }];
export const salary = [{ id: 'sr1', employeeId: 'u-pooja', period: new Date().toISOString().slice(0, 7), baseSalary: '30000', notes: '', createdBy: 'u-hr', createdAt: iso(-1) }];
