use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RouteKind {
    Direct,
    Relay,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct LinkKey {
    pub local: Uuid,
    pub peer: Uuid,
    pub route: RouteKind,
}

impl LinkKey {
    pub fn new(local: Uuid, peer: Uuid, route: RouteKind) -> Self {
        Self { local, peer, route }
    }

    pub fn direct(local: Uuid, peer: Uuid) -> Self {
        Self::new(local, peer, RouteKind::Direct)
    }

    pub fn relay(local: Uuid, peer: Uuid) -> Self {
        Self::new(local, peer, RouteKind::Relay)
    }

    pub fn pair_key(&self) -> PairKey {
        PairKey::from(self.local, self.peer, self.route)
    }
}

impl fmt::Display for LinkKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let route = match self.route {
            RouteKind::Direct => "direct",
            RouteKind::Relay => "relay",
        };
        write!(f, "{}:{}:{}", self.local, self.peer, route)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PairKey {
    pub a: Uuid,
    pub b: Uuid,
    pub route: RouteKind,
}

impl PairKey {
    pub fn from(x: Uuid, y: Uuid, route: RouteKind) -> Self {
        if x <= y {
            Self { a: x, b: y, route }
        } else {
            Self { a: y, b: x, route }
        }
    }
}

impl fmt::Display for PairKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let route = match self.route {
            RouteKind::Direct => "direct",
            RouteKind::Relay => "relay",
        };
        write!(f, "{}:{}:{}", self.a, self.b, route)
    }
}
