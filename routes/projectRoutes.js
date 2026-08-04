const express = require('express');
const router = express.Router();
const pc = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Projects
router.get('/', pc.getMyProjects);
router.post('/', pc.createProject);
router.get('/collaborators/search', pc.searchCollaborators);
router.get('/:id', pc.getProject);
router.put('/:id', pc.updateProject);
router.delete('/:id', pc.deleteProject);

// Collaborators
router.post('/:id/collaborators', pc.addCollaborator);
router.delete('/:id/collaborators/:collaboratorId', pc.removeCollaborator);

// Chats within a project
router.post('/:id/chats', pc.createProjectChat);
router.put('/:id/chats/:chatId', pc.renameProjectChat);
router.delete('/:id/chats/:chatId', pc.deleteProjectChat);
router.get('/:id/chats/:chatId', pc.getProjectChat);
router.post('/:id/chats/:chatId/messages', pc.addProjectChatMessage);

// Collaborative Instructions
router.post('/:id/instructions', pc.addInstruction);
router.delete('/:id/instructions/:instructionId', pc.deleteInstruction);

// Direct Messages (DMs)
router.get('/:id/dms/unread', pc.getUnreadDMCounts);
router.get('/:id/dms/:userId', pc.getDirectMessages);
router.post('/:id/dms', pc.sendDirectMessage);
router.delete('/:id/dms/:userId', pc.clearDirectMessages);

// Project Files
router.post('/:id/files', pc.addProjectFile);
router.delete('/:id/files/:fileId', pc.deleteProjectFile);

// Project Group Chat (WhatsApp Group)
router.get('/:id/group', pc.getGroupMessages);
router.post('/:id/group', pc.sendGroupMessage);
router.delete('/:id/group', pc.clearGroupMessages);

module.exports = router;
