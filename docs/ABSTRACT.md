Identity Block

Team name SibukTA

Project title LearnNexus: A Persistent Virtual Campus for Collaborative

Project-Based Learning

Selected case Case 1: Smarter Campus and Learning

Members Edgi Axel (Leader), Jonathan Lukas, Deffa Kiane, Khaerul Husnaen

1. Problem

University group projects often rely on disconnected tools for communication, file sharing, task

coordination, and assignment management. This fragmentation can make collaboration less organized,

particularly when students have different schedules or need to continue working outside scheduled

classes. Conventional online meeting spaces also tend to focus on temporary interactions rather than

providing a persistent environment for ongoing academic projects.

2. Intended Users

LearnNexus targets university students participating in lecturer-assigned group projects, as well

as lecturers who organize, supervise, and evaluate those projects. It is intended for both scheduled

classroom activities and independent collaboration outside class hours.

3. Supporting Observations or Evidence

A systematic literature review by Donelan and Kear identified low or uneven student participation,

unclear project guidance, scheduling difficulties, and poor group relationships as recurring challenges in

online group projects [1]. These findings highlight the need for better-supported collaboration

environments that maintain both social interaction and clear project organization.

4. Proposed Solution and Core User Flow

LearnNexus is a planned browser-based, multiplayer virtual campus featuring a persistent 2D

environment inspired by spatial collaboration platforms. Rather than creating separate temporary

sessions, the platform will organize users into shared academic spaces containing multiple classrooms

and dedicated team rooms. Students will log in using individual accounts, enter their assigned class, and

navigate to their team's workspace. Interactive workstations will open productivity panels for project

information, tasks, resources, and deliverables. Lecturers will be able to distribute instructions, assign

teams, provide learning materials, and receive submissions through the platform. Project information

and workspace progress will be stored persistently so teams can continue working across multiple

---

sessions. The initial version will focus on class spaces, team workspaces, navigation, and basic project

collaboration.

5. How It Differs from Existing Alternatives

Unlike temporary virtual meeting spaces such as Gather Town, LearnNexus is designed around

persistent academic spaces, lecturer-managed class structures, and assigned team workspaces. Unlike

conventional learning management systems, it emphasizes spatial navigation and interactive

environments as the primary way students access collaborative activities.

6. Planned Technologies

The platform is planned as a web application using React, TypeScript, and Phaser 3 for its

interactive 2D environment. A backend with database storage, authentication, and real-time

communication will support persistent workspaces, user roles, and collaboration. AI integration is not

required for the initial version.

7. Expected Benefit and Development Plan

LearnNexus aims to provide a more organized and engaging environment for student

collaboration while giving lecturers a centralized space to manage group activities. Development will

begin with authentication, class and team structures, and the interactive environment, followed by

workstation panels, project management features, and submission workflows. The main technical risks

involve real-time synchronization and persistent data management, which will be addressed through a

limited initial implementation and iterative testing.

Source Acknowledgments

[1] Donelan, H., & Kear, K. (2024). Online group projects in higher education: persistent challenges and

implications for practice. Journal of Computing in Higher Education, 36, 435–468.

https://doi.org/10.1007/s12528-023-09360-7